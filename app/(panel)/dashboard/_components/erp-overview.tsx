"use client"

import Link from "next/link"
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  LayoutDashboard,
  ReceiptText,
  Users,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ErpPageHeader } from "@/app/(panel)/dashboard/_components/erp-page-header"
import { formatCentsToBrl } from "@/app/utils/convertCurrency"
import { cn } from "@/lib/utils"

const PIE_COLORS = ["#3b82f6", "#0ea5e9", "#06b6d4", "#14b8a6", "#6366f1", "#8b5cf6"]

const cardBase = "border-slate-200 bg-white text-slate-900 shadow-sm"
const tableWrap =
  "overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
const tableHead =
  "border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"

type MonthlyPoint = { label: string; revenueCents: number }
type PieRow = { name: string; value: number }
type RecentSale = {
  id: string
  createdAt: string
  customerName: string | null
  totalCents: number
  status: "DRAFT" | "CONFIRMED" | "CANCELLED"
}

function formatTrend(pct: number | null): string {
  if (pct === null) return "—"
  if (!Number.isFinite(pct)) return "—"
  const sign = pct > 0 ? "+" : ""
  return `${sign}${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
}

function TrendRow({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-xs font-medium text-slate-400">vs. mês anterior</span>
  }
  const up = pct >= 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
        up ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
      {formatTrend(pct)} <span className="font-normal text-slate-500">vs. mês ant.</span>
    </span>
  )
}

function KpiCard({
  title,
  value,
  trendPct,
}: {
  title: string
  value: string
  trendPct: number | null
}) {
  return (
    <Card className={cn("overflow-hidden", cardBase)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{value}</p>
        <TrendRow pct={trendPct} />
      </CardContent>
    </Card>
  )
}

function statusBadge(status: RecentSale["status"]) {
  if (status === "CONFIRMED") return <Badge variant="success">Concluída</Badge>
  if (status === "CANCELLED") return <Badge variant="destructive">Cancelada</Badge>
  return <Badge variant="pending">Rascunho</Badge>
}

function RevenueLineChart({ data }: { data: MonthlyPoint[] }) {
  const hasRealData = data.some((d) => d.revenueCents > 0)
  const sourceData = hasRealData
    ? data
    : data.map((d, i) => ({ ...d, revenueCents: i % 2 === 0 ? 1 : 2 }))

  const max = Math.max(...sourceData.map((d) => d.revenueCents), 1)
  const points = sourceData
    .map((d, i) => {
      const x = sourceData.length === 1 ? 50 : (i / (sourceData.length - 1)) * 100
      const y = 100 - (d.revenueCents / max) * 100
      return `${x},${y}`
    })
    .join(" ")
  const areaPoints = `0,100 ${points} 100,100`
  const allZero = !hasRealData

  return (
    <div className="relative h-full rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      {allZero ? (
        <p className="text-xs font-medium text-slate-500">Sem faturamento no período (amostra)</p>
      ) : null}
      <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
        <line x1="0" y1="100" x2="100" y2="100" stroke="#cbd5e1" strokeWidth="0.8" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="#e2e8f0" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
        <line x1="0" y1="25" x2="100" y2="25" stroke="#e2e8f0" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
        <polygon points={areaPoints} fill={allZero ? "rgba(148,163,184,0.18)" : "rgba(59,130,246,0.18)"} />
        <polyline
          fill="none"
          stroke={allZero ? "#94a3b8" : "#3b82f6"}
          strokeWidth="2.7"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-2 flex justify-between gap-2 text-[10px] text-slate-500">
        {sourceData.map((d) => (
          <span key={d.label} className="truncate">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function ProductPie({ rows }: { rows: PieRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const isSample = !rows.length || total <= 0
  const sourceRows = isSample
    ? [
        { name: "Produto A", value: 4 },
        { name: "Produto B", value: 3 },
        { name: "Produto C", value: 2 },
      ]
    : rows
  const sourceTotal = sourceRows.reduce((sum, row) => sum + row.value, 0)

  let cursor = 0
  const slices = sourceRows.map((row, i) => {
    const pct = (row.value / sourceTotal) * 100
    const start = cursor
    const end = cursor + pct
    cursor = end
    return `${PIE_COLORS[i % PIE_COLORS.length]} ${start}% ${end}%`
  })

  return (
    <div className="min-w-0 space-y-4">
      {isSample ? (
        <p className="w-full text-center text-xs font-medium text-slate-500">
          Sem vendas no período (amostra visível)
        </p>
      ) : null}
      <div className="grid min-w-0 gap-4 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-center">
        <div
          className="relative mx-auto h-52 w-52 shrink-0 rounded-full ring-1 ring-slate-300"
          style={{ background: `conic-gradient(${slices.join(", ")})` }}
        />
        <ul className="min-w-0 space-y-2.5 text-sm">
          {sourceRows.map((row, i) => {
            const pct = sourceTotal > 0 ? (row.value / sourceTotal) * 100 : 0
            return (
              <li
                key={row.name}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-1 transition-colors hover:bg-slate-50"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="size-3 shrink-0 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="truncate text-[17px] font-medium leading-tight text-slate-800">
                    {row.name}
                  </span>
                </span>
                <span className="shrink-0 text-base font-semibold tabular-nums text-slate-900">
                  {pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export function ErpOverview({
  faturamentoMesCents,
  faturamentoTrendPct,
  pedidosMes,
  pedidosTrendPct,
  clientesAtivos,
  ticketMedioCents,
  ticketTrendPct,
  revenueByMonth,
  pieByProduct,
  vendasRecentes,
}: {
  faturamentoMesCents: number
  faturamentoTrendPct: number | null
  pedidosMes: number
  pedidosTrendPct: number | null
  clientesAtivos: number
  ticketMedioCents: number
  ticketTrendPct: number | null
  revenueByMonth: MonthlyPoint[]
  pieByProduct: PieRow[]
  vendasRecentes: RecentSale[]
}) {
  const confirmedRecent = vendasRecentes.filter((s) => s.status === "CONFIRMED").length
  const cancelledRecent = vendasRecentes.filter((s) => s.status === "CANCELLED").length

  return (
    <section className="space-y-6">
      <ErpPageHeader
        title="Visão geral"
        description="Radar executivo da operação comercial com foco em receita, conversão e ritmo de pedidos."
        className="border-0 pb-0"
      />

      <Card className={cn(cardBase, "overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white")}>
        <CardContent className="grid gap-4 p-6 md:grid-cols-[1.25fr_1fr]">
          <div className="space-y-3">
            <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-700">
              Painel executivo
            </Badge>
            <p className="text-xs uppercase tracking-wide text-slate-500">Faturamento do mês</p>
            <p className="text-4xl font-bold tracking-tight text-slate-900">
              {formatCentsToBrl(faturamentoMesCents)}
            </p>
            <TrendRow pct={faturamentoTrendPct} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Confirmadas</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {confirmedRecent.toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Canceladas</p>
              <p className="mt-1 text-xl font-semibold text-rose-600">
                {cancelledRecent.toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="col-span-2 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Links rápidos</span>
                <span className="text-slate-500">Ações</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link href="/dashboard/vendas/nova" className="rounded-md bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200">
                  + Nova venda
                </Link>
                <Link href="/dashboard/vendas" className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
                  Ver vendas
                </Link>
                <Link href="/dashboard/reports" className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
                  Relatórios
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Faturamento (mês)" value={formatCentsToBrl(faturamentoMesCents)} trendPct={faturamentoTrendPct} />
        <KpiCard title="Pedidos (mês)" value={pedidosMes.toLocaleString("pt-BR")} trendPct={pedidosTrendPct} />
        <KpiCard title="Clientes ativos" value={clientesAtivos.toLocaleString("pt-BR")} trendPct={null} />
        <KpiCard title="Ticket médio" value={formatCentsToBrl(ticketMedioCents)} trendPct={ticketTrendPct} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className={cn("min-w-0 overflow-hidden", cardBase)}>
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Faturamento dos últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full min-w-0">
              <RevenueLineChart data={revenueByMonth} />
            </div>
          </CardContent>
        </Card>

        <Card className={cn("min-w-0 overflow-hidden", cardBase)}>
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Vendas por produto (trimestre)</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <ProductPie rows={pieByProduct} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className={cn("xl:col-span-4", cardBase)}>
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Indicadores operacionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="inline-flex items-center gap-2 text-slate-700">
                <CircleDollarSign className="size-4 text-sky-600" />
                Receita mensal
              </div>
              <span className="font-semibold text-slate-900">{formatCentsToBrl(faturamentoMesCents)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="inline-flex items-center gap-2 text-slate-700">
                <ReceiptText className="size-4 text-emerald-600" />
                Pedidos confirmados
              </div>
              <span className="font-semibold text-slate-900">{pedidosMes.toLocaleString("pt-BR")}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="inline-flex items-center gap-2 text-slate-700">
                <Users className="size-4 text-cyan-600" />
                Base ativa
              </div>
              <span className="font-semibold text-slate-900">{clientesAtivos.toLocaleString("pt-BR")} clientes</span>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("xl:col-span-8", cardBase)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base text-slate-900">Pedidos recentes</CardTitle>
            <Link href="/dashboard/vendas" className="text-sm font-medium text-emerald-700 hover:text-emerald-600">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {vendasRecentes.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-slate-500">Nenhuma venda registrada ainda.</p>
            ) : (
              <div className={tableWrap}>
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className={tableHead}>
                    <tr>
                      <th className="px-4 py-3">Pedido</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vendasRecentes.map((sale) => (
                      <tr key={sale.id} className="bg-white transition-colors hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{sale.id.slice(0, 8)}…</td>
                        <td className="px-4 py-3 text-slate-800">{sale.customerName ?? <span className="text-slate-400">Sem cliente</span>}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(sale.createdAt).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-4 py-3">{statusBadge(sale.status)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCentsToBrl(sale.totalCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={cardBase}>
        <CardHeader>
          <CardTitle className="text-base text-slate-900">Financeiro complementar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>
            Parcelas e títulos vinculados às vendas podem ser detalhados nos{" "}
            <Link href="/dashboard/reports" className="font-medium text-emerald-700 underline hover:text-emerald-600">
              relatórios financeiros
            </Link>.
          </p>
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Resumo (em evolução)</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">—</p>
            <p className="mt-1 text-xs text-slate-500">Total a receber consolidado</p>
            <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Vencidas</span>
                <span className="font-medium text-slate-500">—</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>A vencer (7 dias)</span>
                <span className="font-medium text-slate-500">—</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>A vencer (30 dias)</span>
                <span className="font-medium text-slate-500">—</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <LayoutDashboard className="size-3.5 shrink-0 text-slate-500" />
        Indicadores consideram vendas com status{" "}
        <strong className="text-slate-700">Concluída</strong> no período.
      </p>
    </section>
  )
}

