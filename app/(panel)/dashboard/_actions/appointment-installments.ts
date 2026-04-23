"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id"
import { stripe } from "@/app/utils/stripe"

const installmentRowSchema = z.object({
  amountCents: z.number().int().positive(),
  dueDate: z.string().min(1),
  paidAt: z.string().nullable().optional(),
})

const savePlanSchema = z.object({
  appointmentId: z.string().min(1),
  installments: z.array(installmentRowSchema).min(1).max(24),
})

function parseDueDate(raw: string): Date {
  if (raw.includes("T")) {
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) throw new Error("Data inválida")
    return d
  }
  const [y, m, d] = raw.split("-").map(Number)
  if (!y || !m || !d) throw new Error("Data inválida")
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
}

function parseOptionalDateTime(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function saveAppointmentInstallmentPlan(
  raw: z.infer<typeof savePlanSchema>,
) {
  const parsed = savePlanSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Usuário não encontrado" }
  }
  const clinicOwnerId = getClinicOwnerUserId(session)
  if (!clinicOwnerId) {
    return { error: "Clínica não identificada" }
  }

  const { appointmentId, installments } = parsed.data

  try {
    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, userId: clinicOwnerId, status: "COMPLETED" },
      include: { service: true },
    })
    if (!appt) {
      return {
        error: "Só é possível parcelar consultas concluídas desta clínica.",
      }
    }

    const total = installments.reduce((s, r) => s + r.amountCents, 0)
    if (total !== appt.service.price) {
      return {
        error: `A soma das parcelas (${(total / 100).toFixed(2)}) deve ser igual ao valor do serviço (${(appt.service.price / 100).toFixed(2)}).`,
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.appointmentInstallment.deleteMany({ where: { appointmentId } })
      await tx.appointmentInstallment.createMany({
        data: installments.map((row, i) => ({
          appointmentId,
          sequence: i + 1,
          amountCents: row.amountCents,
          dueDate: parseDueDate(row.dueDate),
          paidAt: parseOptionalDateTime(row.paidAt ?? undefined),
        })),
      })
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/reports")

    return { data: "Parcelas atualizadas." }
  } catch {
    return { error: "Não foi possível salvar as parcelas." }
  }
}

export async function setInstallmentPaid(installmentId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Usuário não encontrado" }
  }
  const clinicOwnerId = getClinicOwnerUserId(session)
  if (!clinicOwnerId) {
    return { error: "Clínica não identificada" }
  }

  try {
    const row = await prisma.appointmentInstallment.findFirst({
      where: { id: installmentId, appointment: { userId: clinicOwnerId } },
    })
    if (!row) {
      return { error: "Parcela não encontrada." }
    }

    await prisma.appointmentInstallment.update({
      where: { id: installmentId },
      data: { paidAt: new Date() },
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/reports")

    return { data: "Pagamento registrado." }
  } catch {
    return { error: "Não foi possível registrar o pagamento." }
  }
}

export async function setInstallmentUnpaid(installmentId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Usuário não encontrado" }
  }
  const clinicOwnerId = getClinicOwnerUserId(session)
  if (!clinicOwnerId) {
    return { error: "Clínica não identificada" }
  }

  try {
    const row = await prisma.appointmentInstallment.findFirst({
      where: { id: installmentId, appointment: { userId: clinicOwnerId } },
    })
    if (!row) {
      return { error: "Parcela não encontrada." }
    }

    await prisma.appointmentInstallment.update({
      where: { id: installmentId },
      data: { paidAt: null },
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/reports")

    return { data: "Parcela marcada como não recebida." }
  } catch {
    return { error: "Não foi possível atualizar a parcela." }
  }
}

export async function createInstallmentStripeCheckout(installmentId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Usuário não encontrado" }
  }
  const clinicOwnerId = getClinicOwnerUserId(session)
  if (!clinicOwnerId) {
    return { error: "Clínica não identificada" }
  }

  try {
    const row = await prisma.appointmentInstallment.findFirst({
      where: {
        id: installmentId,
        paidAt: null,
        appointment: { userId: clinicOwnerId, status: "COMPLETED" },
      },
      include: {
        appointment: {
          include: { service: true },
        },
      },
    })

    if (!row) {
      return { error: "Parcela não encontrada ou já recebida." }
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_URL?.trim() || "http://localhost:3000"
    const successUrl = `${baseUrl}/dashboard?payment=success&installment=${encodeURIComponent(
      installmentId,
    )}`
    const cancelUrl = `${baseUrl}/dashboard?payment=cancelled&installment=${encodeURIComponent(
      installmentId,
    )}`

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      billing_address_collection: "required",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: row.amountCents,
            product_data: {
              name: `Parcela ${row.sequence} - ${row.appointment.service.name}`,
              description: `${row.appointment.name} · consulta ${new Intl.DateTimeFormat(
                "pt-BR",
                {
                  timeZone: "UTC",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                },
              ).format(new Date(row.appointment.appointmentDate))} ${row.appointment.time}`,
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        type: "appointment_installment",
        installmentId: row.id,
        appointmentId: row.appointmentId,
      },
    })

    return { url: checkout.url ?? "" }
  } catch {
    return { error: "Não foi possível criar o checkout Stripe." }
  }
}
