import { redirect } from "next/navigation"
import getSession from "@/lib/getSession"
import prisma from "@/lib/prisma"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { SalesDashboardContent } from "../_components/sales-dashboard-content"

function monthRange(year: number, month0: number) {
  const start = new Date(year, month0, 1)
  const end = new Date(year, month0 + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export default async function SalesDashboardPage() {
  const session = await getSession()
  if (!session) redirect("/")

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) redirect("/acesso-empresa")

  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const lastYearStart = new Date(y, m - 11, 1)
  const lastYearEnd = monthRange(y, m).end

  const [sales, goal] = await Promise.all([
    prisma.sale.findMany({
      where: { organizationId, createdAt: { gte: lastYearStart, lte: lastYearEnd } },
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true } },
        lines: { include: { product: { select: { name: true } } } },
      },
    }),
    prisma.salesGoal.findUnique({
      where: {
        organizationId_year_month: {
          organizationId,
          year: y,
          month: m + 1,
        },
      },
      select: { revenueCents: true, ordersCount: true },
    }),
  ])

  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(y, m - 11 + i, 1)
    const { start, end } = monthRange(d.getFullYear(), d.getMonth())
    const totalCents = sales
      .filter((s) => s.status === "CONFIRMED" && s.createdAt >= start && s.createdAt <= end)
      .reduce((sum, s) => sum + s.totalCents, 0)
    return {
      label: start.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      totalCents,
    }
  })

  return (
    <SalesDashboardContent
      goal={{
        year: y,
        month: m + 1,
        revenueCents: goal?.revenueCents ?? null,
        ordersCount: goal?.ordersCount ?? null,
      }}
      monthlyRevenue={monthlyRevenue}
      salesWindow={sales.map((s) => ({
        id: s.id,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        totalCents: s.totalCents,
        customerName: s.customer?.name ?? "Sem cliente",
        lines: s.lines.map((l) => ({
          productName: l.product.name,
          quantity: l.quantity,
          lineTotalCents: l.lineTotalCents,
        })),
      }))}
    />
  )
}

