/** `month`: do 1º dia do mês corrente até agora. `30d`: janela móvel dos últimos 30 dias. */
export type ReportPeriod = "month" | "30d"

export type ServiceRevenueRow = {
  id: string
  name: string
  completedCount: number
  appointmentsCount: number
  estimatedRevenue: number
}

export type DailyRevenuePoint = {
  dateKey: string
  displayLabel: string
  /** Receita reconhecida (competência): concluídos no dia (`updatedAt`). */
  revenue: number
  /** Entrada de caixa: soma das parcelas com `paidAt` neste dia. */
  cashReceived: number
}

/** Caixa vs contas a receber (parcelas). */
export type CashFlowSnapshot = {
  receivedInPeriodCents: number
  outstandingReceivableCents: number
}

export type MostSoldSnapshot = {
  id: string
  name: string
  completedCount: number
  appointmentsCount: number
} | null

export type ServicePerformanceSnapshot = {
  topService: ServiceRevenueRow | null
  mostSoldService: MostSoldSnapshot
  topProfitableServices: ServiceRevenueRow[]
  allServicesByRevenue: ServiceRevenueRow[]
}

/** Uma linha que o sistema ainda enxerga como agendada (status SCHEDULED). */
export type ScheduledPipelineItem = {
  id: string
  patientName: string
  /** Data do slot no calendário (YYYY-MM-DD, UTC — igual à agenda por dia). */
  appointmentDayUtc: string
  time: string
  serviceName: string
  priceInCents: number
}

/** Agendamentos no período ainda em SCHEDULED (não entram na receita até concluir). */
export type ScheduledPipelineSnapshot = {
  count: number
  valueInCents: number
  pendingItems: ScheduledPipelineItem[]
}

/** Mês anterior (inteiro) ou janela de 30 dias anterior, para KPI estilo dashboard. */
export type PeriodComparisonSnapshot = {
  previousGrossRevenue: number
  previousNetResult: number
  /** Variação do resultado vs período anterior; null se não há base para comparar. */
  netResultChangePct: number | null
}

export type DreDashboardPayload = {
  period: ReportPeriod
  grossRevenue: number
  deductions: { label: string; amount: number }[]
  netResult: number
  serviceLines: ServiceRevenueRow[]
  dailySeries: DailyRevenuePoint[]
  metrics: ServicePerformanceSnapshot
  scheduledPipeline: ScheduledPipelineSnapshot
  comparison: PeriodComparisonSnapshot
  cashFlow: CashFlowSnapshot
}
