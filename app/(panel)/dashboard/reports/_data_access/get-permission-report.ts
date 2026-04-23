import prisma from "@/lib/prisma"
import type { PrismaClient } from "@/lib/generated/prisma"
import { eachDayOfInterval, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { utcCalendarDateKey } from "@/app/utils/utc-calendar-date-key"
import type {
  CashFlowSnapshot,
  DailyRevenuePoint,
  DreDashboardPayload,
  PeriodComparisonSnapshot,
  ReportPeriod,
  ScheduledPipelineItem,
  ScheduledPipelineSnapshot,
  ServiceRevenueRow,
} from "../_types/dashboard"

/**
 * Se o servidor ainda estiver com um Prisma Client gerado antes do modelo
 * `AppointmentInstallment`, o delegate não existe em runtime → evita crash.
 * Corrija com `npx prisma generate` e reinicie o `next dev`.
 */
function appointmentInstallmentDelegate(
  client: PrismaClient,
): PrismaClient["appointmentInstallment"] | null {
  const d = (
    client as unknown as {
      appointmentInstallment?: PrismaClient["appointmentInstallment"]
    }
  ).appointmentInstallment
  if (d && typeof d.aggregate === "function") return d
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[reports] Cliente Prisma sem `appointmentInstallment`. Execute `npx prisma generate` e reinicie o servidor.",
    )
  }
  return null
}

export type {
  CashFlowSnapshot,
  DailyRevenuePoint,
  DreDashboardPayload,
  ReportPeriod,
  ServiceRevenueRow,
} from "../_types/dashboard"

export async function getPermissionUserToReports({ userId }: { userId: string}){




const user = await prisma.user.findFirst({
    where:{
        id: userId
    },
    include: {
        subscription: true,
    }
})

if(!user?.subscription || user.subscription.plan !== "PROFESSIONAL") {
    return null;
}

return user;

}

export async function getMostProfitableService({ userId }: { userId: string }) {
  return getServicePerformance({ userId, period: "month" }).then(
    (data) => data.topService,
  )
}

function getPeriodRange(period: ReportPeriod) {
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
function getPreviousComparisonRange(period: ReportPeriod, now = new Date()) {
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

async function getCompletedRevenueSum(
  userId: string,
  start: Date,
  end: Date,
): Promise<number> {
  const rows = await prisma.appointment.findMany({
    where: {
      userId,
      status: "COMPLETED",
      updatedAt: { gte: start, lte: end },
    },
    select: { service: { select: { price: true } } },
  })
  return rows.reduce((s, r) => s + r.service.price, 0)
}

function buildComparisonSnapshot(
  currentNet: number,
  previousGross: number,
): PeriodComparisonSnapshot {
  const previousNetResult = previousGross
  let netResultChangePct: number | null = null
  if (previousNetResult !== 0) {
    netResultChangePct =
      ((currentNet - previousNetResult) / previousNetResult) * 100
  } else if (currentNet !== 0) {
    netResultChangePct = 100
  }
  return {
    previousGrossRevenue: previousGross,
    previousNetResult,
    netResultChangePct,
  }
}

export async function getServicePerformance({
  userId,
  period,
}: {
  userId: string
  period: ReportPeriod
}) {
  const { start, end } = getPeriodRange(period)

  const services = await prisma.service.findMany({
    where: {
      userId,
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

/** Série diária: receita por dia em que a consulta foi marcada como concluída (`updatedAt`). */
/**
 * Janela para contar agendamentos SCHEDULED (ainda não faturados).
 * No mês corrente inclui o calendário inteiro (inclusive datas futuras no mês),
 * para não “sumir” consultas já marcadas para daqui a duas semanas.
 */
function getScheduledPipelineDateRange(period: ReportPeriod) {
  const now = new Date()
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end }
  }
  const start = new Date(now)
  start.setDate(now.getDate() - 30)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/** Valor “na fila”: agendado na janela, ainda não contabilizado como receita. */
export async function getScheduledPipelineInPeriod({
  userId,
  period,
}: {
  userId: string
  period: ReportPeriod
}): Promise<ScheduledPipelineSnapshot> {
  const { start, end } = getScheduledPipelineDateRange(period)

  const rows = await prisma.appointment.findMany({
    where: {
      userId,
      status: "SCHEDULED",
      appointmentDate: {
        gte: start,
        lte: end,
      },
    },
    select: {
      id: true,
      name: true,
      appointmentDate: true,
      time: true,
      service: { select: { name: true, price: true } },
    },
    orderBy: { appointmentDate: "asc" },
  })

  const valueInCents = rows.reduce((sum, r) => sum + r.service.price, 0)

  const pendingItems: ScheduledPipelineItem[] = rows.map((r) => ({
    id: r.id,
    patientName: r.name,
    appointmentDayUtc: utcCalendarDateKey(r.appointmentDate),
    time: r.time,
    serviceName: r.service.name,
    priceInCents: r.service.price,
  }))

  return { count: rows.length, valueInCents, pendingItems }
}

async function getInstallmentCashByDay(
  userId: string,
  start: Date,
  end: Date,
): Promise<Map<string, number>> {
  const inst = appointmentInstallmentDelegate(prisma)
  if (!inst) return new Map()

  const rows = await inst.findMany({
    where: {
      paidAt: { gte: start, lte: end },
      appointment: { userId, status: "COMPLETED" },
    },
    select: { amountCents: true, paidAt: true },
  })

  const byDay = new Map<string, number>()
  for (const r of rows) {
    if (!r.paidAt) continue
    const key = format(r.paidAt, "yyyy-MM-dd")
    byDay.set(key, (byDay.get(key) ?? 0) + r.amountCents)
  }
  return byDay
}

export async function getDailyRevenueSeries({
  userId,
  period,
}: {
  userId: string
  period: ReportPeriod
}): Promise<DailyRevenuePoint[]> {
  const { start, end } = getPeriodRange(period)

  const [appointments, cashByDay] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        userId,
        status: "COMPLETED",
        updatedAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        updatedAt: true,
        service: { select: { price: true } },
      },
    }),
    getInstallmentCashByDay(userId, start, end),
  ])

  const byDay = new Map<string, number>()
  for (const a of appointments) {
    const key = format(a.updatedAt, "yyyy-MM-dd")
    byDay.set(key, (byDay.get(key) ?? 0) + a.service.price)
  }

  const days = eachDayOfInterval({ start, end })
  return days.map((d) => {
    const dateKey = format(d, "yyyy-MM-dd")
    return {
      dateKey,
      displayLabel: format(d, "dd/MM", { locale: ptBR }),
      revenue: byDay.get(dateKey) ?? 0,
      cashReceived: cashByDay.get(dateKey) ?? 0,
    }
  })
}

export async function getCashFlowSnapshot({
  userId,
  period,
}: {
  userId: string
  period: ReportPeriod
}): Promise<CashFlowSnapshot> {
  const { start, end } = getPeriodRange(period)

  const inst = appointmentInstallmentDelegate(prisma)
  if (!inst) {
    return {
      receivedInPeriodCents: 0,
      outstandingReceivableCents: 0,
    }
  }

  const [receivedAgg, outstandingAgg] = await Promise.all([
    inst.aggregate({
      where: {
        paidAt: { gte: start, lte: end },
        appointment: { userId, status: "COMPLETED" },
      },
      _sum: { amountCents: true },
    }),
    inst.aggregate({
      where: {
        paidAt: null,
        appointment: { userId, status: "COMPLETED" },
      },
      _sum: { amountCents: true },
    }),
  ])

  return {
    receivedInPeriodCents: receivedAgg._sum.amountCents ?? 0,
    outstandingReceivableCents: outstandingAgg._sum.amountCents ?? 0,
  }
}

export async function getReportsDashboardData({
  userId,
  period,
}: {
  userId: string
  period: ReportPeriod
}): Promise<DreDashboardPayload> {
  const prev = getPreviousComparisonRange(period)

  const [metrics, dailySeries, scheduledPipeline, previousGross, cashFlow] =
    await Promise.all([
      getServicePerformance({ userId, period }),
      getDailyRevenueSeries({ userId, period }),
      getScheduledPipelineInPeriod({ userId, period }),
      getCompletedRevenueSum(userId, prev.start, prev.end),
      getCashFlowSnapshot({ userId, period }),
    ])

  const serviceLines = metrics.allServicesByRevenue.filter(
    (s) => s.estimatedRevenue > 0,
  )

  const grossRevenue = serviceLines.reduce(
    (sum, s) => sum + s.estimatedRevenue,
    0,
  )

  const deductions: { label: string; amount: number }[] = [
    {
      label: "Custos e deduções (não cadastrados no sistema)",
      amount: 0,
    },
  ]

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0)
  const netResult = grossRevenue - totalDeductions

  const comparison = buildComparisonSnapshot(netResult, previousGross)

  return {
    period,
    grossRevenue,
    deductions,
    netResult,
    serviceLines,
    dailySeries,
    metrics,
    scheduledPipeline,
    comparison,
    cashFlow,
  }
}