import { redirect } from "next/navigation"
import getSession from "@/lib/getSession"
import prisma from "@/lib/prisma"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { ReceivablesContent } from "./_components/receivables-content"

export default async function ContasReceberPage() {
  const session = await getSession()
  if (!session) redirect("/")

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) redirect("/acesso-empresa")

  const [customers, manualReceivables, installments] = await Promise.all([
    prisma.customer.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.receivable.findMany({
      where: { organizationId },
      include: { customer: { select: { name: true } } },
      orderBy: [{ paidAt: "asc" }, { dueDate: "asc" }],
      take: 500,
    }),
    prisma.appointmentInstallment.findMany({
      where: { appointment: { organizationId } },
      include: { appointment: { select: { name: true, service: { select: { name: true } } } } },
      orderBy: [{ paidAt: "asc" }, { dueDate: "asc" }],
      take: 500,
    }),
  ])

  const rows = [
    ...manualReceivables.map((r) => ({
      id: r.id,
      kind: "MANUAL" as const,
      sourceLabel: "Manual",
      customerName: r.customer?.name ?? "Sem cliente",
      description: r.description,
      amountCents: r.amountCents,
      dueDate: r.dueDate.toISOString(),
      paidAt: r.paidAt ? r.paidAt.toISOString() : null,
      notes: r.notes,
    })),
    ...installments.map((r) => ({
      id: r.id,
      kind: "INSTALLMENT" as const,
      sourceLabel: "Parcela de atendimento",
      customerName: r.appointment.name,
      description: `${r.sequence}ª parcela · ${r.appointment.service.name}`,
      amountCents: r.amountCents,
      dueDate: r.dueDate.toISOString(),
      paidAt: r.paidAt ? r.paidAt.toISOString() : null,
      notes: null,
    })),
  ].sort((a, b) => {
    if (a.paidAt && !b.paidAt) return 1
    if (!a.paidAt && b.paidAt) return -1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  return <ReceivablesContent customers={customers} receivables={rows} />
}

