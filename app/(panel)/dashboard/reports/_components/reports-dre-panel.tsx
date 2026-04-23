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

/** Paleta próxima ao exemplo (setores distintos). */
const PIE_COLORS = [
  "#7c3aed",
  "#db2777",
  "#2563eb",
  "#059669",
  "#ca8a04",
  "#dc2626",
  "#0d9488",
  "#4f46e5",
  "#64748b",
  "#ea580c",
  "#9f1239",
  "#166534",
]

type PieSlice = {
  name: string
  fullName: string
  receita: number
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

function ServiceRevenueDonutChart({ pieData }: { pieData: PieSlice[] }) {
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
  const innerRadius = outerRadius * 0.55

  const total = pieData.reduce((s, d) => s + d.receita, 0)

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div
        ref={chartWrapRef}
        className="w-full min-w-0 overflow-x-auto"
        style={{ minHeight: chartHeight }}
      >
        <PieChart width={width} height={chartHeight} aria-label="Receita por serviço">
          <Pie
            data={pieData}
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
            {pieData.map((_: PieSlice, i: number) => (
              <Cell
                key={`cell-${i}`}
                fill={PIE_COLORS[i % PIE_COLORS.length]}
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
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

      <ul className="grid gap-2 border-t border-zinc-100 pt-3 text-xs text-zinc-800 sm:grid-cols-1">
        {pieData.map((row, i) => (
          <li key={`${row.fullName}-${i}`} className="flex gap-2 leading-snug">
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
              aria-hidden
            />
            <span>
              <span className="font-medium text-zinc-900">{row.fullName}</span>
              <span className="text-zinc-600">
                {" "}
                · {formatCurrency(row.receita)}
                {total > 0
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
    scheduledPipeline = { count: 0, valueInCents: 0, pendingItems: [] },
    comparison = {
      previousGrossRevenue: 0,
      previousNetResult: 0,
      netResultChangePct: null,
    },
    cashFlow = {
      receivedInPeriodCents: 0,
      outstandingReceivableCents: 0,
    },
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

  const dailyAvg = useMemo(() => {
    if (!dailySeries.length) return 0
    const sum = dailySeries.reduce((s, d) => s + d.revenue, 0)
    return sum / dailySeries.length
  }, [dailySeries])

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
      ? "text-zinc-600"
      : comparison.netResultChangePct >= 0
        ? "text-blue-700"
        : "text-rose-700"

  /** Recharts gera ids de clipPath diferentes no SSR vs cliente → hidratação quebrada. */
  const [chartsMounted, setChartsMounted] = useState(false)
  useEffect(() => {
    setChartsMounted(true)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 border-b border-zinc-200 pb-4">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
          DRE Dashboard
        </h2>
        <p className="text-xs text-zinc-500">
          Visão executiva · {periodLabels[period]}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(periodLabels) as ReportPeriod[]).map((p) => (
            <Link
              key={p}
              href={`/dashboard/reports?period=${p}`}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                period === p
                  ? "border-violet-600 bg-violet-600 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {periodLabels[p]}
            </Link>
          ))}
        </div>
      </div>

      {scheduledPipeline.count > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium text-amber-950">
            No sistema há {scheduledPipeline.count}{" "}
            {scheduledPipeline.count === 1
              ? "consulta com status Agendado"
              : "consultas com status Agendado"}{" "}
            neste período ({formatCurrency(scheduledPipeline.valueInCents)}) — isso{" "}
            <span className="font-semibold">não entra na receita</span> até marcar{" "}
            <strong>Concluído</strong> na agenda.
          </p>
          <p className="mt-2 text-xs text-amber-900/90">
            Abaixo está o que o banco ainda grava como <strong>Agendado</strong>. Na
            agenda principal, cada data é uma tela: use <strong>“Abrir este dia na
            agenda”</strong> ou o quadro roxo <strong>“Agendados em outros dias”</strong>{" "}
            (quando estiver em outro dia na agenda). No dia certo, aparecem também o
            bloco azul <strong>“Quem agendou hoje”</strong> e a lista por horário.
          </p>
          <ul className="mt-3 space-y-2 rounded-md border border-amber-200/80 bg-white/80 p-3 text-xs text-amber-950">
            {(scheduledPipeline.pendingItems ?? []).map((row) => (
              <li key={row.id} className="flex flex-col gap-1 border-b border-amber-100/80 pb-2 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-semibold">{row.patientName}</span>
                  <span className="text-amber-900/90">
                    {" "}
                    · {row.serviceName} · {formatCurrency(row.priceInCents)}
                  </span>
                  <div className="mt-0.5 text-[11px] text-amber-800/90">
                    Data (agenda): {row.appointmentDayUtc} · {row.time}
                  </div>
                </div>
                <Link
                  href={`/dashboard?date=${encodeURIComponent(row.appointmentDayUtc)}`}
                  className="shrink-0 font-medium text-amber-950 underline underline-offset-2 hover:text-amber-800"
                >
                  Abrir este dia na agenda
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard"
            className="mt-3 inline-block text-sm font-semibold text-amber-950 underline underline-offset-2"
          >
            Ir para a agenda (hoje)
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Coluna esquerda: KPI + DRE */}
        <div className="space-y-4 xl:col-span-5">
          <div className="rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-800">
              Competência (resultado)
            </p>
            <p className="mt-1 text-2xl font-bold text-violet-950 tabular-nums">
              {formatCurrency(netResult)}
            </p>
            <p className="mt-2 text-[11px] leading-snug text-violet-900/85">
              <strong>Receita reconhecida</strong> no período:{" "}
              {formatCurrency(grossRevenue)} · <strong>Caixa</strong> (parcelas
              recebidas): {formatCurrency(cashFlow.receivedInPeriodCents)} ·{" "}
              <strong>A receber</strong> (parcelas em aberto):{" "}
              {formatCurrency(cashFlow.outstandingReceivableCents)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-violet-100 pt-3 text-sm">
              <div>
                <p className="text-xs text-zinc-500">Variação vs período ant.</p>
                <p className={`text-lg font-semibold tabular-nums ${changeTone}`}>
                  {formatChangePct(comparison.netResultChangePct)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Período anterior</p>
                <p className="text-lg font-semibold text-zinc-800 tabular-nums">
                  {formatCurrency(comparison.previousNetResult)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <article className="rounded-md border bg-white p-3 text-xs shadow-sm">
              <p className="font-medium uppercase tracking-wide text-zinc-500">
                Mais lucrativo
              </p>
              <p className="mt-1 line-clamp-2 font-semibold text-zinc-900">
                {metrics.topService?.name ?? "—"}
              </p>
              <p className="mt-0.5 text-zinc-600">
                {metrics.topService
                  ? `${formatCurrency(metrics.topService.estimatedRevenue)}`
                  : "Sem concluídas"}
              </p>
            </article>
            <article className="rounded-md border bg-white p-3 text-xs shadow-sm">
              <p className="font-medium uppercase tracking-wide text-zinc-500">
                Mais vendido
              </p>
              <p className="mt-1 line-clamp-2 font-semibold text-zinc-900">
                {metrics.mostSoldService?.name ?? "—"}
              </p>
              <p className="mt-0.5 text-zinc-600">
                {metrics.mostSoldService
                  ? `${metrics.mostSoldService.completedCount} concl.`
                  : "—"}
              </p>
            </article>
          </div>

          <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900">DRE simplificado</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Consultas <strong>concluídas</strong> e preço do serviço. Atualiza a cada
              ~45 s.
            </p>
            <div className="mt-4 overflow-hidden rounded-md border border-zinc-200">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-zinc-100">
                  <tr className="bg-violet-100/90">
                    <td className="px-3 py-2.5 font-semibold text-violet-950">
                      (+) Receita bruta
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-violet-950 tabular-nums">
                      {formatCurrency(grossRevenue)}
                    </td>
                  </tr>
                  {serviceLines.length > 0 ? (
                    serviceLines.map((row) => (
                      <tr key={row.id} className="bg-white">
                        <td className="px-3 py-2 pl-5 text-zinc-700">
                          {row.name}{" "}
                          <span className="text-zinc-400">({row.completedCount})</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-800">
                          {formatCurrency(row.estimatedRevenue)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-3 py-3 text-center italic text-zinc-500"
                      >
                        Sem receita no período.
                      </td>
                    </tr>
                  )}
                  {deductions.map((d, i) => (
                    <tr key={i} className="bg-zinc-50/90">
                      <td className="px-3 py-2 text-zinc-700">(−) {d.label}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-zinc-800">
                        {formatCurrency(d.amount)}
                      </td>
                    </tr>
                  ))}
                  {totalDeductions > 0 ? (
                    <tr className="bg-rose-50">
                      <td className="px-3 py-2 font-semibold text-rose-900">
                        Total deduções
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-rose-900 tabular-nums">
                        {formatCurrency(totalDeductions)}
                      </td>
                    </tr>
                  ) : null}
                  <tr className="bg-violet-900 text-white">
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
          <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900">
              Composição da receita
            </h3>
            <p className="text-xs text-zinc-500">
              % sobre a receita bruta do período
            </p>
            <div className="mt-3 overflow-hidden rounded-md border border-zinc-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-600">
                    <th className="px-3 py-2 font-medium">Descrição</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                    <th className="w-16 px-2 py-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr className="bg-white">
                    <td className="px-3 py-2 font-medium text-zinc-800">
                      Receita bruta
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-zinc-900">
                      {formatCurrency(grossRevenue)}
                    </td>
                    <td className="px-2 py-2 text-right text-zinc-600">100%</td>
                  </tr>
                  {pieData.map((row, i) => (
                    <tr key={`${row.name}-${i}`} className="bg-white">
                      <td className="px-3 py-2 text-zinc-700">{row.fullName}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-800">
                        {formatCurrency(row.receita)}
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-600">
                        {pctOfGross(row.receita, grossRevenue)}
                      </td>
                    </tr>
                  ))}
                  {deductions.map((d, idx) => (
                    <tr key={`ded-${idx}`} className="bg-zinc-50/80">
                      <td className="px-3 py-2 text-zinc-700">(−) {d.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-800">
                        {formatCurrency(d.amount)}
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-600">
                        {pctOfGross(d.amount, grossRevenue)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-900 text-white">
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

            <div className="mt-4 rounded-md border border-zinc-100 bg-zinc-50/50 p-2">
              {pieData.length === 0 ? (
                <div className="flex h-[320px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-200 bg-white px-4 text-center">
                  <p className="text-sm font-medium text-zinc-700">
                    Sem fatias (sem receita concluída)
                  </p>
                  <p className="max-w-xs text-xs text-zinc-500">
                    Conclua consultas na agenda para ver o gráfico em rosca.
                  </p>
                </div>
              ) : !chartsMounted ? (
                <div
                  className="flex min-h-[280px] w-full items-center justify-center rounded-md bg-zinc-100 text-xs text-zinc-500"
                  aria-busy
                >
                  Carregando gráfico…
                </div>
              ) : (
                <ServiceRevenueDonutChart pieData={pieData} />
              )}
            </div>
          </section>
        </div>

        {/* Direita: linha + barras */}
        <div className="space-y-4 xl:col-span-3">
          <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
            <h3 className="text-xs font-semibold text-zinc-900">
              Evolução diária: reconhecida vs caixa
            </h3>
            <p className="text-[10px] text-zinc-500">
              {periodLabels[period]} · roxa = competência (concluído); verde =
              parcelas pagas na data
            </p>
            <div className="mt-2 h-[220px] w-full min-w-0">
              {!hasDailyChart ? (
                <div className="flex h-full items-center justify-center rounded border border-dashed border-zinc-200 bg-zinc-50 px-2 text-center text-[11px] text-zinc-500">
                  Sem série no período
                </div>
              ) : !chartsMounted ? (
                <div
                  className="flex h-full w-full items-center justify-center rounded-md bg-zinc-100 text-xs text-zinc-500"
                  aria-busy
                >
                  Carregando gráfico…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySeries} margin={{ left: 0, right: 4, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="displayLabel" tick={{ fontSize: 9 }} interval={4} />
                    <YAxis
                      width={36}
                      tick={{ fontSize: 9 }}
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
                        stroke="#a1a1aa"
                        strokeDasharray="4 4"
                        label={{
                          value: "Média rec.",
                          position: "insideTopRight",
                          fill: "#71717a",
                          fontSize: 9,
                        }}
                      />
                    ) : null}
                    <Tooltip
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
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Receita reconhecida"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="cashReceived"
                      name="Caixa (parcelas)"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
            <h3 className="text-xs font-semibold text-zinc-900">
              Receita por serviço
            </h3>
            <p className="text-[10px] text-zinc-500">Valores no período</p>
            <div className="mt-2 h-[220px] w-full min-w-0">
              {barData.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded border border-dashed border-zinc-200 bg-zinc-50 text-[11px] text-zinc-500">
                  Sem barras
                </div>
              ) : !chartsMounted ? (
                <div
                  className="flex h-full w-full items-center justify-center rounded-md bg-zinc-100 text-xs text-zinc-500"
                  aria-busy
                >
                  Carregando gráfico…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ left: 0, right: 4, bottom: 28 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 8 }}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={48}
                    />
                    <YAxis
                      width={32}
                      tick={{ fontSize: 9 }}
                      tickFormatter={(v) =>
                        new Intl.NumberFormat("pt-BR", {
                          notation: "compact",
                          maximumFractionDigits: 0,
                        }).format(Number(v) / 100)
                      }
                    />
                    <Tooltip
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
                    <Bar dataKey="receita" fill="#0d9488" radius={[3, 3, 0, 0]} />
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
