"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { hasOrganizationPermission } from "@/app/utils/auth/rbac"
import { sendReceivablesRemindersForOrganization } from "@/lib/notifications/receivables-reminder"

const createReceivableSchema = z.object({
  customerId: z.string().optional(),
  description: z.string().trim().min(3, "Descrição é obrigatória"),
  amountCents: z.number().int().positive("Valor deve ser maior que zero"),
  dueDate: z.string().min(1, "Vencimento é obrigatório"),
  notes: z.string().trim().optional(),
})

const markSchema = z.object({
  kind: z.enum(["MANUAL", "INSTALLMENT"]),
  id: z.string().min(1),
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

async function getContext() {
  const session = await auth()
  if (!session?.user?.id) return { error: "Sessão inválida." } as const
  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) return { error: "Empresa não identificada." } as const
  const canManage = await hasOrganizationPermission({
    session,
    organizationId,
    permission: "receivables:manage",
  })
  if (!canManage) return { error: "Sem permissão para gerir contas a receber." } as const
  return { organizationId, userId: session.user.id } as const
}

export async function createManualReceivable(raw: z.infer<typeof createReceivableSchema>) {
  const parsed = createReceivableSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }

  const ctx = await getContext()
  if ("error" in ctx) return { error: ctx.error }

  try {
    if (parsed.data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: parsed.data.customerId, organizationId: ctx.organizationId },
        select: { id: true },
      })
      if (!customer) return { error: "Cliente inválido para esta empresa." }
    }

    await prisma.receivable.create({
      data: {
        organizationId: ctx.organizationId,
        customerId: parsed.data.customerId || null,
        description: parsed.data.description,
        amountCents: parsed.data.amountCents,
        dueDate: parseDueDate(parsed.data.dueDate),
        notes: parsed.data.notes || null,
        createdByUserId: ctx.userId,
      },
    })

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      category: "FINANCE",
      action: "receivable.create",
      summary: `Conta a receber: ${parsed.data.description.slice(0, 80)}`,
      metadata: { amountCents: parsed.data.amountCents },
    })

    revalidatePath("/dashboard/contas-receber")
    return { ok: true as const }
  } catch {
    return { error: "Não foi possível cadastrar a conta a receber." }
  }
}

export async function markReceivablePaid(raw: z.infer<typeof markSchema>) {
  const parsed = markSchema.safeParse(raw)
  if (!parsed.success) return { error: "Dados inválidos." }
  const ctx = await getContext()
  if ("error" in ctx) return { error: ctx.error }

  try {
    if (parsed.data.kind === "MANUAL") {
      const row = await prisma.receivable.findFirst({
        where: { id: parsed.data.id, organizationId: ctx.organizationId },
        select: { id: true },
      })
      if (!row) return { error: "Conta a receber não encontrada." }
      await prisma.receivable.update({
        where: { id: row.id },
        data: { paidAt: new Date() },
      })
    } else {
      const row = await prisma.appointmentInstallment.findFirst({
        where: { id: parsed.data.id, appointment: { organizationId: ctx.organizationId } },
        select: { id: true },
      })
      if (!row) return { error: "Parcela não encontrada." }
      await prisma.appointmentInstallment.update({
        where: { id: row.id },
        data: { paidAt: new Date() },
      })
    }

    revalidatePath("/dashboard/contas-receber")
    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      category: "FINANCE",
      action: "receivable.mark_paid",
      summary: `Recebimento registrado (${parsed.data.kind})`,
      entityId: parsed.data.id,
    })
    return { ok: true as const }
  } catch {
    return { error: "Não foi possível marcar como recebido." }
  }
}

export async function markReceivableUnpaid(raw: z.infer<typeof markSchema>) {
  const parsed = markSchema.safeParse(raw)
  if (!parsed.success) return { error: "Dados inválidos." }
  const ctx = await getContext()
  if ("error" in ctx) return { error: ctx.error }

  try {
    if (parsed.data.kind === "MANUAL") {
      const row = await prisma.receivable.findFirst({
        where: { id: parsed.data.id, organizationId: ctx.organizationId },
        select: { id: true },
      })
      if (!row) return { error: "Conta a receber não encontrada." }
      await prisma.receivable.update({
        where: { id: row.id },
        data: { paidAt: null },
      })
    } else {
      const row = await prisma.appointmentInstallment.findFirst({
        where: { id: parsed.data.id, appointment: { organizationId: ctx.organizationId } },
        select: { id: true },
      })
      if (!row) return { error: "Parcela não encontrada." }
      await prisma.appointmentInstallment.update({
        where: { id: row.id },
        data: { paidAt: null },
      })
    }

    revalidatePath("/dashboard/contas-receber")
    return { ok: true as const }
  } catch {
    return { error: "Não foi possível atualizar o status da conta." }
  }
}

export async function sendReceivablesReminders() {
  const ctx = await getContext()
  if ("error" in ctx) return { error: ctx.error }
  return sendReceivablesRemindersForOrganization(ctx.organizationId)
}

