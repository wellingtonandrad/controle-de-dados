"use server"

import prisma from "@/lib/prisma"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import {
  deleteInstallmentsForAppointment,
  ensureDefaultInstallmentAfterComplete,
} from "../_lib/appointment-installments"

const formSchema = z.object({
  appointmentId: z.string().min(1, "Você precisa fornecer um agendamento"),
  status: z.enum(["COMPLETED", "NO_SHOW", "SCHEDULED", "CANCELED"]),
})

type FormSchema = z.infer<typeof formSchema>

export async function updateAppointmentStatus(formData: FormSchema) {
  const schema = formSchema.safeParse(formData)

  if (!schema.success) {
    return {
      error: schema.error.issues[0]?.message,
    }
  }

  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: "Usuário não encontrado",
    }
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    return { error: "Empresa não identificada" }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const currentAppointment = await tx.appointment.findFirst({
        where: {
          id: formData.appointmentId,
          organizationId,
        },
        include: {
          service: { select: { id: true, name: true } },
        },
      })
      if (!currentAppointment) {
        throw new Error("Consulta não encontrada.")
      }

      const isCompletingNow =
        currentAppointment.status !== "COMPLETED" &&
        formData.status === "COMPLETED"

      if (isCompletingNow) {
        const consumptions = await tx.serviceStockConsumption.findMany({
          where: { serviceId: currentAppointment.serviceId },
          include: {
            stockItem: {
              select: { id: true, name: true, currentQuantity: true },
            },
          },
        })

        const insufficient = consumptions.find(
          (row) => row.stockItem.currentQuantity < row.quantity,
        )
        if (insufficient) {
          throw new Error(
            `Estoque insuficiente para ${insufficient.stockItem.name}.`,
          )
        }

        for (const row of consumptions) {
          await tx.stockItem.update({
            where: { id: row.stockItem.id },
            data: { currentQuantity: { decrement: row.quantity } },
          })
          await tx.stockMovement.create({
            data: {
              stockItemId: row.stockItem.id,
              kind: "APPOINTMENT_CONSUMPTION",
              quantity: row.quantity,
              note: `Consumo automático: ${currentAppointment.service.name}`,
              appointmentId: currentAppointment.id,
              createdByUserId: session.user.id,
            },
          })
        }
      }

      await tx.appointment.update({
        where: {
          id: formData.appointmentId,
          organizationId,
        },
        data: {
          status: formData.status,
        },
      })

      if (formData.status !== "COMPLETED") {
        await deleteInstallmentsForAppointment(tx, formData.appointmentId)
      } else {
        await ensureDefaultInstallmentAfterComplete(tx, formData.appointmentId)
      }
    })

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/estoque")
    revalidatePath("/dashboard/reports")

    return {
      data: "Status da consulta atualizado",
    }
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar o status da consulta.",
    }
  }
}
