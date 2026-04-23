import type { Prisma } from "@/lib/generated/prisma"

export async function deleteInstallmentsForAppointment(
  tx: Prisma.TransactionClient,
  appointmentId: string,
) {
  await tx.appointmentInstallment.deleteMany({ where: { appointmentId } })
}

/** Uma parcela única, já “paga” por padrão (equivalente ao fluxo antigo sem parcelamento). */
export async function ensureDefaultInstallmentAfterComplete(
  tx: Prisma.TransactionClient,
  appointmentId: string,
) {
  const existing = await tx.appointmentInstallment.count({
    where: { appointmentId },
  })
  if (existing > 0) return

  const appt = await tx.appointment.findFirst({
    where: { id: appointmentId, status: "COMPLETED" },
    include: { service: true },
  })
  if (!appt) return

  await tx.appointmentInstallment.create({
    data: {
      appointmentId: appt.id,
      sequence: 1,
      amountCents: appt.service.price,
      dueDate: appt.appointmentDate,
      paidAt: new Date(),
    },
  })
}
