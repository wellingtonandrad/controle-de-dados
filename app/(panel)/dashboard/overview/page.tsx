import { redirect } from "next/navigation"
import getSession from "@/lib/getSession"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import prisma from "@/lib/prisma"
import { ErpOverview } from "../_components/erp-overview"

export const dynamic = "force-dynamic"

function monthRange(year: number, month0: number) {
  const start = new Date(year, month0, 1)
  const end = new Date(year, month0 + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export default async function OverviewPage() {
  const session = await getSession()
  if (!session) redirect("/")

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) redirect("/acesso-empresa")

  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  const thisMonth = monthRange(y, m)
  const prevMonth = monthRange(y, m - 1)

  const [thisAgg, prevAgg, clientesAtivos, revenueMonths, lineGroups, recentSales] =
    await Promise.all([
      prisma.sale.aggregate({
        where: {
          organizationId,
          status: "CONFIRMED",
          createdAt: { gte: thisMonth.start, lte: now },
        },
        _sum: { totalCents: true },
        _count: { _all: true },
      }),
      prisma.sale.aggregate({
        where: {
          organizationId,
          status: "CONFIRMED",
          createdAt: { gte: prevMonth.start, lte: prevMonth.end },
        },
        _sum: { totalCents: true },
        _count: { _all: true },
      }),
      prisma.customer.count({ where: { organizationId, active: true } }),
      Promise.all(
        Array.from({ length: 6 }, (_, i) => {
          const d = new Date(y, m - 5 + i, 1)
          const { start, end } = monthRange(d.getFullYear(), d.getMonth())
          return prisma.sale.aggregate({
            where: {
              organizationId,
              status: "CONFIRMED",
              createdAt: { gte: start, lte: end },
            },
            _sum: { totalCents: true },
          }).then((agg) => ({
            label: start.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
            revenueCents: agg._sum.totalCents ?? 0,
          }))
        }),
      ),
      prisma.saleLine
        .groupBy({
          by: ["productId"],
          where: {
            sale: {
              organizationId,
              status: "CONFIRMED",
              createdAt: {
                gte: new Date(now.getFullYear(), now.getMonth() - 2, 1),
              },
            },
          },
          _sum: { lineTotalCents: true },
        })
        .then((rows) =>
          [...rows]
            .sort((a, b) => (b._sum.lineTotalCents ?? 0) - (a._sum.lineTotalCents ?? 0))
            .slice(0, 12),
        ),
      prisma.sale.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          totalCents: true,
          status: true,
          customer: { select: { name: true } },
        },
      }),
    ])

  const fatCents = thisAgg._sum.totalCents ?? 0
  const prevFatCents = prevAgg._sum.totalCents ?? 0
  const pedidos = thisAgg._count._all
  const prevPedidos = prevAgg._count._all
  const ticketCents = pedidos > 0 ? Math.round(fatCents / pedidos) : 0
  const prevTicketCents = prevPedidos > 0 ? Math.round(prevFatCents / prevPedidos) : 0

  function pctTrend(cur: number, prev: number): number | null {
    if (prev <= 0) return cur > 0 ? null : 0
    return ((cur - prev) / prev) * 100
  }

  const productIds = lineGroups.map((g) => g.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  })
  const nameById = new Map(products.map((p) => [p.id, p.name]))
  const pieSlices = lineGroups
    .map((g) => ({
      name: nameById.get(g.productId) ?? "Produto",
      value: g._sum.lineTotalCents ?? 0,
    }))
    .filter((s) => s.value > 0)

  const topPie = pieSlices.slice(0, 5)
  const restSum = pieSlices.slice(5).reduce((a, s) => a + s.value, 0)
  const pieByProduct =
    restSum > 0 ? [...topPie, { name: "Outros", value: restSum }] : topPie

  return (
    <div className="mx-auto max-w-7xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <ErpOverview
          faturamentoMesCents={fatCents}
          faturamentoTrendPct={pctTrend(fatCents, prevFatCents)}
          pedidosMes={pedidos}
          pedidosTrendPct={pctTrend(pedidos, prevPedidos)}
          clientesAtivos={clientesAtivos}
          ticketMedioCents={ticketCents}
          ticketTrendPct={pctTrend(ticketCents, prevTicketCents)}
          revenueByMonth={revenueMonths}
          pieByProduct={pieByProduct}
          vendasRecentes={recentSales.map((s) => ({
            id: s.id,
            createdAt: s.createdAt.toISOString(),
            customerName: s.customer?.name ?? null,
            totalCents: s.totalCents,
            status: s.status,
          }))}
        />
      </div>
    </div>
  )
}
