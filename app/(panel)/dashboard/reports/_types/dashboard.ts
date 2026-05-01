/** `month`: do 1º dia do mês corrente até agora. `30d`: janela móvel dos últimos 30 dias. */
export type ReportPeriod = "month" | "30d"

/**
 * Receita por produto no período (vendas confirmadas).
 * Nomes legados `estimatedRevenue` / `completedCount` / `appointmentsCount` mantidos para o gráfico:
 * - `estimatedRevenue`: total em centavos
 * - `completedCount`: unidades vendidas (soma das quantidades nas linhas)
 * - `appointmentsCount`: número de pedidos (vendas) distintos com esse produto
 */
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
  /** Faturamento: vendas confirmadas registradas neste dia (`createdAt`). */
  revenue: number
  /** Saídas: compras confirmadas registradas neste dia (`createdAt`). */
  cashReceived: number
}

/** Resumo de caixa a partir do que foi registrado no ERP. */
export type CashFlowSnapshot = {
  /** Total de vendas confirmadas no período (entrada reconhecida). */
  receivedInPeriodCents: number
  /** Valor ainda em pedidos rascunho (não confirmados). */
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

/** Pedido em rascunho ainda não contabilizado como faturamento. */
export type DraftSalePipelineItem = {
  id: string
  customerName: string | null
  createdAt: string
  totalCents: number
}

export type DraftSalesSnapshot = {
  count: number
  valueInCents: number
  items: DraftSalePipelineItem[]
}

/** Período anterior para comparação do resultado (vendas − compras). */
export type PeriodComparisonSnapshot = {
  previousGrossRevenue: number
  previousNetResult: number
  netResultChangePct: number | null
}

export type DreDashboardPayload = {
  period: ReportPeriod
  /** Soma das vendas confirmadas no período (centavos). */
  grossRevenue: number
  deductions: { label: string; amount: number }[]
  netResult: number
  serviceLines: ServiceRevenueRow[]
  dailySeries: DailyRevenuePoint[]
  metrics: ServicePerformanceSnapshot
  draftSalesPipeline: DraftSalesSnapshot
  comparison: PeriodComparisonSnapshot
  cashFlow: CashFlowSnapshot
  /** Quantidade de vendas confirmadas no período. */
  confirmedSalesCount: number
}
