"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type {
  DailyRevenuePoint,
  DreDashboardPayload,
  ReportPeriod,
} from "../_types/dashboard"

const periodLabels: Record<ReportPeriod, string> = {
  month: "Este mês (do dia 1 até agora)",
  "30d": "Últimos 30 dias",
}

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100)
}

function centsFromTooltipValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function shortName(name: string, max = 18) {
  if (name.length <= max) return name
  return `${name.slice(0, max)}…`
}

function pctOfGross(part: number, gross: number): string {
  if (gross <= 0) return "—"
  return `${((part / gross) * 100).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`
}

function formatChangePct(n: number | null): string {
  if (n == null) return "—"
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
}

function formatPercent(n: number): string {
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
}

/** Paleta corporativa (tons slate + azul + teal), legível em fundo escuro. */
const PIE_COLORS = [
  "#60a5fa",
  "#38bdf8",
  "#22d3ee",
  "#2dd4bf",
  "#94a3b8",
  "#64748b",
  "#475569",
  "#3b82f6",
  "#0ea5e9",
  "#14b8a6",
  "#334155",
  "#1e40af",
]

const CHART_DARK = {
  grid: "#334155",
  axis: "#94a3b8",
  revenueLine: "#60a5fa",
  cashLine: "#34d399",
  barFill: "#3b82f6",
  refLine: "#64748b",
  tooltipBg: "#0f172a",
  tooltipBorder: "#334155",
  tooltipLabel: "#e2e8f0",
} as const

const tooltipDarkProps = {
  contentStyle: {
    backgroundColor: CHART_DARK.tooltipBg,
    border: `1px solid ${CHART_DARK.tooltipBorder}`,
    borderRadius: 8,
  },
  labelStyle: { color: CHART_DARK.tooltipLabel, fontSize: 11 },
  itemStyle: { color: CHART_DARK.tooltipLabel, fontSize: 11 },
} as const

type PieSlice = {
  name: string
  fullName: string
  receita: number
  color?: string
  isSample?: boolean
}

const PIE_OTHERS_MAX = 8

function buildServicePieData(
  lines: { id: string; name: string; estimatedRevenue: number }[],
): PieSlice[] {
  const positive = lines
    .filter((s) => s.estimatedRevenue > 0)
    .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue)

  if (positive.length <= PIE_OTHERS_MAX) {
    return positive.map((s) => ({
      name: shortName(s.name, 22),
      fullName: s.name,
      receita: s.estimatedRevenue,
    }))
  }

  const head = positive.slice(0, PIE_OTHERS_MAX - 1)
  const tail = positive.slice(PIE_OTHERS_MAX - 1)
  const outrosSum = tail.reduce((s, x) => s + x.estimatedRevenue, 0)

  return [
    ...head.map((s) => ({
      name: shortName(s.name, 22),
      fullName: s.name,
      receita: s.estimatedRevenue,
    })),
    {
      name: "Outros",
      fullName: tail.map((t) => t.name).join(", "),
      receita: outrosSum,
    },
  ]
}

function piePercentLabel(props: {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  percent?: number
}) {
  const {
    cx = 0,
    cy = 0,
    midAngle = 0,
    innerRadius = 0,
    outerRadius = 0,
    percent = 0,
  } = props
  if (percent < 0.055) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const pct = (percent * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
      style={{ textShadow: "0 1px 2px rgb(0 0 0 / 0.45)" }}
    >
      {`${pct}%`}
    </text>
  )
}

function ServiceRevenuePieChart({
  pieData,
  taxDeductionCents,
}: {
  pieData: PieSlice[]
  taxDeductionCents: number
}) {
  const chartWrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(360)

  useLayoutEffect(() => {
    const el = chartWrapRef.current
    if (!el) return

    const measure = () => {
      const w = el.getBoundingClientRect().width
      setWidth(Math.max(280, Math.floor(w)))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const chartHeight = 260
  const cx = width / 2
  const cy = chartHeight / 2
  const outerRadius = Math.min(108, width * 0.32)
  const innerRadius = 0

  const chartDataBase: PieSlice[] =
    taxDeductionCents > 0
      ? [
          ...pieData,
          {
            name: "Imposto",
            fullName: "Dedução de imposto",
            receita: taxDeductionCents,
            color: "#fb7185",
          },
        ]
      : pieData
  const chartData: PieSlice[] =
    chartDataBase.length > 0
      ? chartDataBase
      : [
          {
            name: "Sem dados",
            fullName: "Sem dados no período",
            receita: 1,
            color: "#334155",
            isSample: true,
          },
          {
            name: "Imposto",
            fullName: "Dedução de imposto",
            receita: 1,
            color: "#475569",
            isSample: true,
          },
        ]
  const total = chartData.reduce((s, d) => s + d.receita, 0)

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div
        ref={chartWrapRef}
        className="w-full min-w-0 overflow-x-auto"
        style={{ minHeight: chartHeight }}
      >
        <PieChart width={width} height={chartHeight} aria-label="Receita por serviço">
          <Pie
            data={chartData}
            dataKey="receita"
            nameKey="name"
            cx={cx}
            cy={cy}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={1}
            labelLine={false}
            label={piePercentLabel}
            isAnimationActive={false}
          >
            {chartData.map((row: PieSlice, i: number) => (
              <Cell
                key={`cell-${i}`}
                fill={row.color ?? PIE_COLORS[i % PIE_COLORS.length]}
                stroke="#0f172a"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            {...tooltipDarkProps}
            formatter={(value, _n, item) => {
              const cents = centsFromTooltipValue(value)
              const row = item?.payload as PieSlice | undefined
              const share =
                total > 0 && cents != null
                  ? ((cents / total) * 100).toLocaleString("pt-BR", {
                      maximumFractionDigits: 1,
                    })
                  : null
              return [
                cents != null
                  ? `${formatCurrency(cents)}${share != null ? ` (${share}%)` : ""}`
                  : "",
                row?.fullName ?? row?.name ?? "",
              ]
            }}
          />
        </PieChart>
      </div>

      <ul className="grid gap-2 border-t border-white/[0.08] pt-3 text-xs text-slate-300 sm:grid-cols-1">
        {chartData.map((row, i) => (
          <li key={`${row.fullName}-${i}`} className="flex gap-2 leading-snug">
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: row.color ?? PIE_COLORS[i % PIE_COLORS.length] }}
              aria-hidden
            />
            <span>
            <span className="font-medium text-slate-100">{row.fullName}</span>
            <span className="text-slate-400">
                {" "}
                · {formatCurrency(row.isSample ? 0 : row.receita)}
                {!row.isSample && total > 0
                  ? ` (${pctOfGross(row.receita, total)} da receita)`
                  : null}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface ReportsDrePanelProps {
  initialData: DreDashboardPayload
  period: ReportPeriod
}

export function ReportsDrePanel({ initialData, period }: ReportsDrePanelProps) {
  const { data = initialData } = useQuery({
    queryKey: ["reports-dashboard", period],
    queryFn: async () => {
      const res = await fetch(
        `/api/dashboard/reports?period=${encodeURIComponent(period)}`,
        { cache: "no-store" },
      )
      if (!res.ok) throw new Error("Falha ao carregar relatórios")
      return res.json() as Promise<DreDashboardPayload>
    },
    initialData,
    /** `initialData` do SSR senão isso fica “fresco” e o cliente não refaz o fetch. */
    initialDataUpdatedAt: 0,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 45_000,
  })

  const {
    grossRevenue,
    deductions,
    netResult,
    serviceLines,
    dailySeries,
    metrics,
    draftSalesPipeline = { count: 0, valueInCents: 0, items: [] },
    comparison = {
      previousGrossRevenue: 0,
      previousNetResult: 0,
      netResultChangePct: null,
    },
    cashFlow = {
      receivedInPeriodCents: 0,
      outstandingReceivableCents: 0,
    },
    confirmedSalesCount = 0,
  } = data

  const pieData = buildServicePieData(serviceLines)
  const hasRevenue = grossRevenue > 0
  const hasDailyChart = useMemo(
    () => dailySeries.some((d) => d.revenue > 0 || d.cashReceived > 0),
    [dailySeries],
  )
  const totalDeductions = useMemo(
    () => deductions.reduce((s, d) => s + d.amount, 0),
    [deductions],
  )
  const taxDeductionCents = useMemo(
    () =>
      deductions
        .filter((d) => /imposto|tax|tribut/i.test(d.label))
        .reduce((sum, d) => sum + d.amount, 0),
    [deductions],
  )

  const dailyAvg = useMemo(() => {
    if (!dailySeries.length) return 0
    const sum = dailySeries.reduce((s, d) => s + d.revenue, 0)
    return sum / dailySeries.length
  }, [dailySeries])

  const unitsSold = useMemo(
    () => serviceLines.reduce((sum, s) => sum + s.completedCount, 0),
    [serviceLines],
  )

  const ticketMedio =
    confirmedSalesCount > 0 ? grossRevenue / confirmedSalesCount : 0
  const marginPct = grossRevenue > 0 ? (netResult / grossRevenue) * 100 : 0

  const barData = useMemo(
    () =>
      serviceLines
        .filter((s) => s.estimatedRevenue > 0)
        .map((s) => ({
          name: shortName(s.name, 12),
          fullName: s.name,
          receita: s.estimatedRevenue,
        })),
    [serviceLines],
  )

  const changeTone =
    comparison.netResultChangePct == null
      ? "text-slate-400"
      : comparison.netResultChangePct >= 0
        ? "text-sky-400"
        : "text-rose-400"

  /** Recharts gera ids de clipPath diferentes no SSR vs cliente → hidratação quebrada. */
  const [chartsMounted, setChartsMounted] = useState(false)
  useEffect(() => {
    setChartsMounted(true)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 border-b border-white/[0.08] pb-4">
        <h2 className="text-xl font-semibold tracking-tight text-slate-50">
          Painel executivo
        </h2>
        <p className="text-xs text-slate-400">
          Cálculo a partir de <strong className="text-slate-200">vendas</strong> e{" "}
          <strong className="text-slate-200">compras</strong> que você registra no ERP ·{" "}
          {periodLabels[period]}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(periodLabels) as ReportPeriod[]).map((p) => (
            <Link
              key={p}
              href={`/dashboard/reports?period=${p}`}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p
                  ? "border-emerald-500/80 bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-500/30"
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              {periodLabels[p]}
            </Link>
          ))}
        </div>
      </div>

      {draftSalesPipeline.count > 0 ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-50">
            Há {draftSalesPipeline.count}{" "}
            {draftSalesPipeline.count === 1 ? "pedido em rascunho" : "pedidos em rascunho"}{" "}
            neste período, totalizando {formatCurrency(draftSalesPipeline.valueInCents)} —{" "}
            <span className="font-semibold text-amber-200">ainda não entram na receita</span> até
            você confirmar a venda.
          </p>
          <ul className="mt-3 space-y-2 rounded-lg border border-amber-500/20 bg-black/20 p-3 text-xs text-amber-100/95">
            {(draftSalesPipeline.items ?? []).map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-1 border-b border-amber-500/15 pb-2 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-semibold text-amber-50">
                    {row.customerName ?? "Sem cliente"}
                  </span>
                  <span className="text-amber-200/90">
                    {" "}
                    · {formatCurrency(row.totalCents)} ·{" "}
                    {new Date(row.createdAt).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <Link
                  href="/dashboard/vendas"
                  className="shrink-0 font-medium text-amber-200 underline underline-offset-2 hover:text-amber-50"
                >
                  Ir para vendas
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <article className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 shadow-sm backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Receita</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-50">
            {formatCurrency(grossRevenue)}
          </p>
        </article>
        <article className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 shadow-sm backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Resultado</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-50">
            {formatCurrency(netResult)}
          </p>
        </article>
        <article className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 shadow-sm backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Ticket medio</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-50">
            {formatCurrency(ticketMedio)}
          </p>
        </article>
        <article className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 shadow-sm backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Margem</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-50">
            {formatPercent(marginPct)}
          </p>
        </article>
        <article className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 shadow-sm backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Pedidos</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-50">
            {confirmedSalesCount.toLocaleString("pt-BR")}
          </p>
        </article>
        <article className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 shadow-sm backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Unidades</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-50">
            {unitsSold.toLocaleString("pt-BR")}
          </p>
        </article>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Coluna esquerda: KPI + DRE */}
        <div className="space-y-4 xl:col-span-5">
          <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 p-4 shadow-lg ring-1 ring-white/[0.06]">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/90">
              Competência (resultado)
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-50">
              {formatCurrency(netResult)}
            </p>
            <p className="mt-2 text-[11px] leading-snug text-slate-400">
              <strong className="text-slate-200">Receita reconhecida</strong> no período:{" "}
              {formatCurrency(grossRevenue)} ·{" "}
              <strong className="text-slate-200">Caixa</strong> (parcelas recebidas):{" "}
              {formatCurrency(cashFlow.receivedInPeriodCents)} ·{" "}
              <strong className="text-slate-200">A receber</strong> (parcelas em aberto):{" "}
              {formatCurrency(cashFlow.outstandingReceivableCents)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/[0.08] pt-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Variação vs período ant.</p>
                <p className={`text-lg font-semibold tabular-nums ${changeTone}`}>
                  {formatChangePct(comparison.netResultChangePct)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Período anterior</p>
                <p className="text-lg font-semibold text-slate-200 tabular-nums">
                  {formatCurrency(comparison.previousNetResult)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <article className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 text-xs shadow-sm backdrop-blur-sm">
              <p className="font-medium uppercase tracking-wide text-slate-500">
                Mais lucrativo
              </p>
              <p className="mt-1 line-clamp-2 font-semibold text-slate-100">
                {metrics.topService?.name ?? "—"}
              </p>
              <p className="mt-0.5 text-slate-400">
                {metrics.topService
                  ? `${formatCurrency(metrics.topService.estimatedRevenue)}`
                  : "Sem concluídas"}
              </p>
            </article>
            <article className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 text-xs shadow-sm backdrop-blur-sm">
              <p className="font-medium uppercase tracking-wide text-slate-500">
                Mais vendido
              </p>
              <p className="mt-1 line-clamp-2 font-semibold text-slate-100">
                {metrics.mostSoldService?.name ?? "—"}
              </p>
              <p className="mt-0.5 text-slate-400">
                {metrics.mostSoldService
                  ? `${metrics.mostSoldService.completedCount} concl.`
                  : "—"}
              </p>
            </article>
          </div>

          <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 shadow-sm backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-slate-100">DRE simplificado</h3>
            <p className="mt-1 text-xs text-slate-500">
              Consultas <strong className="text-slate-300">concluídas</strong> e preço do
              serviço. Atualiza a cada ~45 s.
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-white/[0.08]">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-white/[0.06]">
                  <tr className="bg-sky-500/15">
                    <td className="px-3 py-2.5 font-semibold text-sky-100">
                      (+) Receita bruta
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-sky-50 tabular-nums">
                      {formatCurrency(grossRevenue)}
                    </td>
                  </tr>
                  {serviceLines.length > 0 ? (
                    serviceLines.map((row) => (
                      <tr key={row.id} className="bg-transparent">
                        <td className="px-3 py-2 pl-5 text-slate-300">
                          {row.name}{" "}
                          <span className="text-slate-500">({row.completedCount})</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-200">
                          {formatCurrency(row.estimatedRevenue)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-3 py-3 text-center italic text-slate-500"
                      >
                        Sem receita no período.
                      </td>
                    </tr>
                  )}
                  {deductions.map((d, i) => (
                    <tr key={i} className="bg-white/[0.03]">
                      <td className="px-3 py-2 text-slate-300">(−) {d.label}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-200">
                        {formatCurrency(d.amount)}
                      </td>
                    </tr>
                  ))}
                  {totalDeductions > 0 ? (
                    <tr className="bg-rose-500/10">
                      <td className="px-3 py-2 font-semibold text-rose-200">
                        Total deduções
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-rose-100 tabular-nums">
                        {formatCurrency(totalDeductions)}
                      </td>
                    </tr>
                  ) : null}
                  <tr className="bg-slate-800/90 text-slate-50">
                    <td className="px-3 py-2.5 font-semibold">(=) Resultado</td>
                    <td className="px-3 py-2.5 text-right text-base font-bold tabular-nums">
                      {formatCurrency(netResult)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Centro: tabela resumo + donut */}
        <div className="space-y-3 xl:col-span-4">
          <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 shadow-sm backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-slate-100">
              Composição da receita
            </h3>
            <p className="text-xs text-slate-500">
              % sobre a receita bruta do período
            </p>
            <div className="mt-3 overflow-hidden rounded-lg border border-white/[0.08]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.04] text-left text-slate-400">
                    <th className="px-3 py-2 font-medium">Descrição</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                    <th className="w-16 px-2 py-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  <tr className="bg-transparent">
                    <td className="px-3 py-2 font-medium text-slate-200">
                      Receita bruta
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-50">
                      {formatCurrency(grossRevenue)}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-500">100%</td>
                  </tr>
                  {pieData.map((row, i) => (
                    <tr key={`${row.name}-${i}`} className="bg-transparent">
                      <td className="px-3 py-2 text-slate-300">{row.fullName}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-200">
                        {formatCurrency(row.receita)}
                      </td>
                      <td className="px-2 py-2 text-right text-slate-500">
                        {pctOfGross(row.receita, grossRevenue)}
                      </td>
                    </tr>
                  ))}
                  {deductions.map((d, idx) => (
                    <tr key={`ded-${idx}`} className="bg-white/[0.03]">
                      <td className="px-3 py-2 text-slate-300">(−) {d.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-200">
                        {formatCurrency(d.amount)}
                      </td>
                      <td className="px-2 py-2 text-right text-slate-500">
                        {pctOfGross(d.amount, grossRevenue)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-800/90 text-slate-50">
                    <td className="px-3 py-2.5 font-semibold">Resultado</td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                      {formatCurrency(netResult)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold">
                      {pctOfGross(netResult, grossRevenue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-lg border border-white/[0.08] bg-slate-950/40 p-2">
              {!chartsMounted ? (
                <div
                  className="flex min-h-[280px] w-full items-center justify-center rounded-lg bg-slate-900/60 text-xs text-slate-500"
                  aria-busy
                >
                  Carregando gráfico…
                </div>
              ) : (
                <ServiceRevenuePieChart
                  pieData={pieData}
                  taxDeductionCents={taxDeductionCents}
                />
              )}
            </div>
          </section>
        </div>

        {/* Direita: linha + barras */}
        <div className="space-y-4 xl:col-span-3">
          <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 shadow-sm backdrop-blur-sm">
            <h3 className="text-xs font-semibold text-slate-100">
              Evolução diária: reconhecida vs caixa
            </h3>
            <p className="text-[10px] text-slate-500">
              {periodLabels[period]} · azul = competência (concluído); verde = parcelas pagas
              na data
            </p>
            <div className="mt-2 h-[220px] w-full min-w-0">
              {!hasDailyChart ? (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10 bg-slate-950/30 px-2 text-center text-[11px] text-slate-500">
                  Sem série no período
                </div>
              ) : !chartsMounted ? (
                <div
                  className="flex h-full w-full items-center justify-center rounded-lg bg-slate-900/60 text-xs text-slate-500"
                  aria-busy
                >
                  Carregando gráfico…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySeries} margin={{ left: 0, right: 4, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_DARK.grid} />
                    <XAxis
                      dataKey="displayLabel"
                      tick={{ fontSize: 9, fill: CHART_DARK.axis }}
                      stroke={CHART_DARK.axis}
                      interval={4}
                    />
                    <YAxis
                      width={36}
                      tick={{ fontSize: 9, fill: CHART_DARK.axis }}
                      stroke={CHART_DARK.axis}
                      tickFormatter={(v) =>
                        new Intl.NumberFormat("pt-BR", {
                          notation: "compact",
                          maximumFractionDigits: 0,
                        }).format(Number(v) / 100)
                      }
                    />
                    {dailyAvg > 0 ? (
                      <ReferenceLine
                        y={dailyAvg}
                        stroke={CHART_DARK.refLine}
                        strokeDasharray="4 4"
                        label={{
                          value: "Média rec.",
                          position: "insideTopRight",
                          fill: CHART_DARK.axis,
                          fontSize: 9,
                        }}
                      />
                    ) : null}
                    <Tooltip
                      {...tooltipDarkProps}
                      formatter={(value, name) => {
                        const cents = centsFromTooltipValue(value)
                        const label =
                          name === "cashReceived"
                            ? "Caixa"
                            : name === "revenue"
                              ? "Reconhecida"
                              : String(name)
                        return cents != null
                          ? [formatCurrency(cents), label]
                          : ["", label]
                      }}
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as
                          | DailyRevenuePoint
                          | undefined
                        return row?.dateKey ?? ""
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: 10,
                        color: CHART_DARK.tooltipLabel,
                        paddingTop: 4,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Receita reconhecida"
                      stroke={CHART_DARK.revenueLine}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="cashReceived"
                      name="Caixa (parcelas)"
                      stroke={CHART_DARK.cashLine}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 shadow-sm backdrop-blur-sm">
            <h3 className="text-xs font-semibold text-slate-100">Receita por produto</h3>
            <p className="text-[10px] text-slate-500">Vendas confirmadas no período</p>
            <div className="mt-2 h-[220px] w-full min-w-0">
              {barData.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10 bg-slate-950/30 text-[11px] text-slate-500">
                  Sem barras
                </div>
              ) : !chartsMounted ? (
                <div
                  className="flex h-full w-full items-center justify-center rounded-lg bg-slate-900/60 text-xs text-slate-500"
                  aria-busy
                >
                  Carregando gráfico…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ left: 0, right: 4, bottom: 28 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART_DARK.grid}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 8, fill: CHART_DARK.axis }}
                      stroke={CHART_DARK.axis}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={48}
                    />
                    <YAxis
                      width={32}
                      tick={{ fontSize: 9, fill: CHART_DARK.axis }}
                      stroke={CHART_DARK.axis}
                      tickFormatter={(v) =>
                        new Intl.NumberFormat("pt-BR", {
                          notation: "compact",
                          maximumFractionDigits: 0,
                        }).format(Number(v) / 100)
                      }
                    />
                    <Tooltip
                      {...tooltipDarkProps}
                      formatter={(value, _n, item) => {
                        const cents = centsFromTooltipValue(value)
                        const full = (
                          item?.payload as { fullName?: string } | undefined
                        )?.fullName
                        return [
                          cents != null ? formatCurrency(cents) : "",
                          full ?? "",
                        ]
                      }}
                    />
                    <Bar
                      dataKey="receita"
                      fill={CHART_DARK.barFill}
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
