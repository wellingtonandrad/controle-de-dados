import prisma from "@/lib/prisma"
import { eachDayOfInterval, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type {
  CashFlowSnapshot,
  DailyRevenuePoint,
  DraftSalesSnapshot,
  DreDashboardPayload,
  PeriodComparisonSnapshot,
  ReportPeriod,
  ServicePerformanceSnapshot,
  ServiceRevenueRow,
} from "../_types/dashboard"

export type {
  CashFlowSnapshot,
  DailyRevenuePoint,
  DreDashboardPayload,
  ReportPeriod,
  ServiceRevenueRow,
} from "../_types/dashboard"

export async function getPermissionUserToReports({
  billingUserId,
}: {
  billingUserId: string
}) {
  const user = await prisma.user.findFirst({
    where: { id: billingUserId },
  })
  if (!user) {
    return null
  }
  return user
}

export async function getMostProfitableService({
  organizationId,
}: {
  organizationId: string
}) {
  return getServicePerformance({ organizationId, period: "month" }).then(
    (data) => data.topService,
  )
}

export function getPeriodRange(period: ReportPeriod) {
  const now = new Date()

  if (period === "30d") {
    const start = new Date(now)
    start.setDate(now.getDate() - 30)
    return { start, end: now }
  }

  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
    end: now,
  }
}

/** Janela imediatamente anterior à atual (mês civil anterior ou 30 dias antes). */
export function getPreviousComparisonRange(period: ReportPeriod, now = new Date()) {
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    return { start, end }
  }

  const curStart = new Date(now)
  curStart.setDate(now.getDate() - 30)
  curStart.setHours(0, 0, 0, 0)
  const prevEnd = new Date(curStart)
  prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevEnd.getDate() - 30)
  prevStart.setHours(0, 0, 0, 0)
  return { start: prevStart, end: prevEnd }
}

function buildComparisonSnapshot(
  currentNet: number,
  previousNet: number,
): PeriodComparisonSnapshot {
  let netResultChangePct: number | null = null
  if (previousNet !== 0) {
    netResultChangePct = ((currentNet - previousNet) / previousNet) * 100
  } else if (currentNet !== 0) {
    netResultChangePct = null
  }
  return {
    previousGrossRevenue: previousNet,
    previousNetResult: previousNet,
    netResultChangePct,
  }
}

/** Usado pelo módulo legado de Serviços (insights por agendamento). */
export async function getServicePerformance({
  organizationId,
  period,
}: {
  organizationId: string
  period: ReportPeriod
}) {
  const { start, end } = getPeriodRange(period)

  const services = await prisma.service.findMany({
    where: {
      organizationId,
      status: true,
    },
    select: {
      id: true,
      name: true,
      price: true,
      appointment: {
        where: {
          OR: [
            {
              status: "COMPLETED",
              updatedAt: { gte: start, lte: end },
            },
            {
              status: { not: "COMPLETED" },
              appointmentDate: { gte: start, lte: end },
            },
          ],
        },
        select: {
          id: true,
          status: true,
        },
      },
    },
  })

  if (!services.length) {
    return {
      topService: null,
      mostSoldService: null,
      topProfitableServices: [],
      allServicesByRevenue: [],
    }
  }

  const sortedByProfit = services
    .map((service) => {
      const completedCount = service.appointment.filter(
        (appointment) => appointment.status === "COMPLETED",
      ).length
      const activeCount = service.appointment.filter(
        (appointment) =>
          appointment.status === "SCHEDULED" || appointment.status === "COMPLETED",
      ).length
      const estimatedRevenue = completedCount * service.price

      return {
        id: service.id,
        name: service.name,
        completedCount,
        appointmentsCount: activeCount,
        estimatedRevenue,
      }
    })
    .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue)

  const topProfitableServices = sortedByProfit
    .filter((service) => service.estimatedRevenue > 0)
    .slice(0, 3)

  const topService = topProfitableServices[0] ?? null

  const mostSoldCandidates = services.map((service) => {
    const completedCount = service.appointment.filter(
      (a) => a.status === "COMPLETED",
    ).length
    const activeCount = service.appointment.filter(
      (a) => a.status === "SCHEDULED" || a.status === "COMPLETED",
    ).length
    return {
      id: service.id,
      name: service.name,
      completedCount,
      appointmentsCount: activeCount,
    }
  })

  const mostSoldService =
    mostSoldCandidates.sort((a, b) => {
      if (b.completedCount !== a.completedCount) {
        return b.completedCount - a.completedCount
      }
      return b.appointmentsCount - a.appointmentsCount
    })[0] ?? null

  const mostSoldServiceFiltered =
    mostSoldService &&
    (mostSoldService.completedCount > 0 || mostSoldService.appointmentsCount > 0)
      ? mostSoldService
      : null

  return {
    topService,
    mostSoldService: mostSoldServiceFiltered,
    topProfitableServices,
    allServicesByRevenue: sortedByProfit,
  }
}

async function sumConfirmedSalesCents(
  organizationId: string,
  start: Date,
  end: Date,
): Promise<number> {
  const agg = await prisma.sale.aggregate({
    where: {
      organizationId,
      status: "CONFIRMED",
      createdAt: { gte: start, lte: end },
    },
    _sum: { totalCents: true },
  })
  return agg._sum.totalCents ?? 0
}

async function sumConfirmedPurchasesCents(
  organizationId: string,
  start: Date,
  end: Date,
): Promise<number> {
  const agg = await prisma.purchase.aggregate({
    where: {
      organizationId,
      status: "CONFIRMED",
      createdAt: { gte: start, lte: end },
    },
    _sum: { totalCents: true },
  })
  return agg._sum.totalCents ?? 0
}

async function countConfirmedSales(
  organizationId: string,
  start: Date,
  end: Date,
): Promise<number> {
  return prisma.sale.count({
    where: {
      organizationId,
      status: "CONFIRMED",
      createdAt: { gte: start, lte: end },
    },
  })
}

async function getProductRevenueRows(
  organizationId: string,
  start: Date,
  end: Date,
): Promise<ServiceRevenueRow[]> {
  const lines = await prisma.saleLine.findMany({
    where: {
      sale: {
        organizationId,
        status: "CONFIRMED",
        createdAt: { gte: start, lte: end },
      },
    },
    select: {
      quantity: true,
      lineTotalCents: true,
      saleId: true,
      product: { select: { id: true, name: true } },
    },
  })

  type Acc = {
    name: string
    qty: number
    revenue: number
    saleIds: Set<string>
  }
  const map = new Map<string, Acc>()
  for (const row of lines) {
    const pid = row.product.id
    const cur = map.get(pid) ?? {
      name: row.product.name,
      qty: 0,
      revenue: 0,
      saleIds: new Set<string>(),
    }
    cur.qty += row.quantity
    cur.revenue += row.lineTotalCents
    cur.saleIds.add(row.saleId)
    map.set(pid, cur)
  }

  return [...map.entries()].map(([id, v]) => ({
    id,
    name: v.name,
    completedCount: v.qty,
    appointmentsCount: v.saleIds.size,
    estimatedRevenue: v.revenue,
  }))
}

function buildMetricsFromProductLines(
  lines: ServiceRevenueRow[],
): ServicePerformanceSnapshot {
  const sorted = [...lines]
    .filter((l) => l.estimatedRevenue > 0)
    .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue)
  const topProfitableServices = sorted.slice(0, 3)
  const topService = topProfitableServices[0] ?? null

  const mostSoldCandidates = [...lines].sort((a, b) => {
    if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount
    return b.appointmentsCount - a.appointmentsCount
  })
  const mostSold = mostSoldCandidates[0]
  const mostSoldFiltered =
    mostSold && (mostSold.completedCount > 0 || mostSold.appointmentsCount > 0)
      ? mostSold
      : null

  return {
    topService,
    mostSoldService: mostSoldFiltered,
    topProfitableServices,
    allServicesByRevenue: sorted.length ? sorted : lines,
  }
}

async function getErpDailySeries(
  organizationId: string,
  start: Date,
  end: Date,
): Promise<DailyRevenuePoint[]> {
  const [sales, purchases] = await Promise.all([
    prisma.sale.findMany({
      where: {
        organizationId,
        status: "CONFIRMED",
        createdAt: { gte: start, lte: end },
      },
      select: { createdAt: true, totalCents: true },
    }),
    prisma.purchase.findMany({
      where: {
        organizationId,
        status: "CONFIRMED",
        createdAt: { gte: start, lte: end },
      },
      select: { createdAt: true, totalCents: true },
    }),
  ])

  const revenueByDay = new Map<string, number>()
  for (const s of sales) {
    const key = format(s.createdAt, "yyyy-MM-dd")
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + s.totalCents)
  }

  const purchasesByDay = new Map<string, number>()
  for (const p of purchases) {
    const key = format(p.createdAt, "yyyy-MM-dd")
    purchasesByDay.set(key, (purchasesByDay.get(key) ?? 0) + p.totalCents)
  }

  const days = eachDayOfInterval({ start, end })
  return days.map((d) => {
    const dateKey = format(d, "yyyy-MM-dd")
    return {
      dateKey,
      displayLabel: format(d, "dd/MM", { locale: ptBR }),
      revenue: revenueByDay.get(dateKey) ?? 0,
      cashReceived: purchasesByDay.get(dateKey) ?? 0,
    }
  })
}

async function getDraftSalesPipeline(
  organizationId: string,
  start: Date,
  end: Date,
): Promise<DraftSalesSnapshot> {
  const where = {
    organizationId,
    status: "DRAFT" as const,
    createdAt: { gte: start, lte: end },
  }

  const [sumAgg, countDraft, rows] = await Promise.all([
    prisma.sale.aggregate({
      where,
      _sum: { totalCents: true },
    }),
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        totalCents: true,
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ])

  return {
    count: countDraft,
    valueInCents: sumAgg._sum.totalCents ?? 0,
    items: rows.map((r) => ({
      id: r.id,
      customerName: r.customer?.name ?? null,
      createdAt: r.createdAt.toISOString(),
      totalCents: r.totalCents,
    })),
  }
}

export async function getReportsDashboardData({
  organizationId,
  period,
}: {
  organizationId: string
  period: ReportPeriod
}): Promise<DreDashboardPayload> {
  const { start, end } = getPeriodRange(period)
  const prev = getPreviousComparisonRange(period)

  const [
    salesCents,
    purchasesCents,
    prevSales,
    prevPurchases,
    productLines,
    dailySeries,
    draftPipeline,
    confirmedSalesCount,
  ] = await Promise.all([
    sumConfirmedSalesCents(organizationId, start, end),
    sumConfirmedPurchasesCents(organizationId, start, end),
    sumConfirmedSalesCents(organizationId, prev.start, prev.end),
    sumConfirmedPurchasesCents(organizationId, prev.start, prev.end),
    getProductRevenueRows(organizationId, start, end),
    getErpDailySeries(organizationId, start, end),
    getDraftSalesPipeline(organizationId, start, end),
    countConfirmedSales(organizationId, start, end),
  ])

  const grossRevenue = salesCents
  const purchaseTotal = purchasesCents
  const deductions: { label: string; amount: number }[] = [
    { label: "Compras confirmadas (período)", amount: purchaseTotal },
  ]
  const netResult = grossRevenue - purchaseTotal
  const previousNet = prevSales - prevPurchases
  const comparison = buildComparisonSnapshot(netResult, previousNet)

  const metrics = buildMetricsFromProductLines(productLines)
  const serviceLines = productLines.filter((s) => s.estimatedRevenue > 0)

  const cashFlow: CashFlowSnapshot = {
    receivedInPeriodCents: salesCents,
    outstandingReceivableCents: draftPipeline.valueInCents,
  }

  return {
    period,
    grossRevenue,
    deductions,
    netResult,
    serviceLines,
    dailySeries,
    metrics,
    draftSalesPipeline: draftPipeline,
    comparison,
    cashFlow,
    confirmedSalesCount,
  }
}
