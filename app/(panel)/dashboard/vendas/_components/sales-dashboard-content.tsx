"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowDownRight, ArrowUpRight, Download, ShoppingCart, Target, TrendingUp, Wallet } from "lucide-react"
import { toast } from "sonner"
import { ErpPageHeader } from "@/app/(panel)/dashboard/_components/erp-page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { formatCentsToBrl } from "@/app/utils/convertCurrency"
import { erpTableHead, erpTableWrap } from "@/lib/erp-shell"
import { saveSalesGoal } from "../_actions/sales-dashboard-actions"

type MonthlyRevenueRow = { label: string; totalCents: number }
type TopProduct = { name: string; revenueCents: number; quantity: number }
type TopCustomer = { name: string; orders: number; revenueCents: number }
type SalesWindowRow = {
  id: string
  status: "DRAFT" | "CONFIRMED" | "CANCELLED"
  createdAt: string
  totalCents: number
  customerName: string
  lines: { productName: string; quantity: number; lineTotalCents: number }[]
}

type PeriodKey = "7D" | "30D" | "90D"
type GoalData = {
  year: number
  month: number
  revenueCents: number | null
  ordersCount: number | null
}

function Trend({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-slate-400">sem base anterior</span>
  const positive = value >= 0
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${positive ? "text-emerald-600" : "text-red-600"}`}>
      {positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
      {value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. mês anterior
    </span>
  )
}

function KpiCard({
  label,
  value,
  trend,
  icon,
}: {
  label: string
  value: string
  trend: number | null
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</CardTitle>
        <span className="text-slate-500">{icon}</span>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        <Trend value={trend} />
      </CardContent>
    </Card>
  )
}

const PIE_COLORS = ["#2563eb", "#22c55e", "#ef4444"]

export function SalesDashboardContent({
  monthlyRevenue,
  salesWindow,
  goal,
}: {
  monthlyRevenue: MonthlyRevenueRow[]
  salesWindow: SalesWindowRow[]
  goal: GoalData
}) {
  const [period, setPeriod] = useState<PeriodKey>("30D")
  const [savingGoal, setSavingGoal] = useState(false)
  const [goalRevenueInput, setGoalRevenueInput] = useState(goal.revenueCents ? String(goal.revenueCents / 100) : "")
  const [goalOrdersInput, setGoalOrdersInput] = useState(goal.ordersCount ? String(goal.ordersCount) : "")
  const days = period === "7D" ? 7 : period === "30D" ? 30 : 90

  const metrics = useMemo(() => {
    const now = Date.now()
    const currentStart = now - days * 24 * 60 * 60 * 1000
    const prevStart = currentStart - days * 24 * 60 * 60 * 1000

    const current = salesWindow.filter((s) => new Date(s.createdAt).getTime() >= currentStart)
    const previous = salesWindow.filter((s) => {
      const t = new Date(s.createdAt).getTime()
      return t >= prevStart && t < currentStart
    })

    const confirmedCurrent = current.filter((s) => s.status === "CONFIRMED")
    const confirmedPrev = previous.filter((s) => s.status === "CONFIRMED")

    const revenue = confirmedCurrent.reduce((sum, s) => sum + s.totalCents, 0)
    const revenuePrev = confirmedPrev.reduce((sum, s) => sum + s.totalCents, 0)
    const orders = confirmedCurrent.length
    const ordersPrev = confirmedPrev.length
    const ticket = orders > 0 ? Math.round(revenue / orders) : 0
    const ticketPrev = ordersPrev > 0 ? Math.round(revenuePrev / ordersPrev) : 0

    const byStatus = {
      DRAFT: current.filter((s) => s.status === "DRAFT").length,
      CONFIRMED: current.filter((s) => s.status === "CONFIRMED").length,
      CANCELLED: current.filter((s) => s.status === "CANCELLED").length,
    }
    const base = byStatus.DRAFT + byStatus.CONFIRMED + byStatus.CANCELLED
    const conversionPct = base > 0 ? (byStatus.CONFIRMED / base) * 100 : 0

    const trend = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null)

    const byProduct = new Map<string, TopProduct>()
    const byCustomer = new Map<string, TopCustomer>()
    for (const s of confirmedCurrent) {
      const customer = byCustomer.get(s.customerName) ?? { name: s.customerName, orders: 0, revenueCents: 0 }
      customer.orders += 1
      customer.revenueCents += s.totalCents
      byCustomer.set(s.customerName, customer)

      for (const l of s.lines) {
        const prod = byProduct.get(l.productName) ?? { name: l.productName, quantity: 0, revenueCents: 0 }
        prod.quantity += l.quantity
        prod.revenueCents += l.lineTotalCents
        byProduct.set(l.productName, prod)
      }
    }

    const topProducts = [...byProduct.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 8)
    const topCustomers = [...byCustomer.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 8)

    return {
      revenue,
      orders,
      ticket,
      conversionPct,
      byStatus,
      topProducts,
      topCustomers,
      goals: {
        revenueGoal: Math.max(1, Math.round(revenuePrev * 1.1)),
        ordersGoal: Math.max(1, Math.round(ordersPrev * 1.1)),
      },
      trends: {
        revenue: trend(revenue, revenuePrev),
        orders: trend(orders, ordersPrev),
        ticket: trend(ticket, ticketPrev),
      },
    }
  }, [days, salesWindow])

  const statusData = [
    { name: "Orçamentos", value: metrics.byStatus.DRAFT },
    { name: "Confirmadas", value: metrics.byStatus.CONFIRMED },
    { name: "Canceladas", value: metrics.byStatus.CANCELLED },
  ]
  const monthlyOrdersData = monthlyRevenue.map((m) => ({
    ...m,
    orders: salesWindow.filter(
      (s) =>
        s.status === "CONFIRMED" &&
        new Date(s.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }) === m.label,
    ).length,
    ticketCents:
      salesWindow.filter(
        (s) =>
          s.status === "CONFIRMED" &&
          new Date(s.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }) === m.label,
      ).length > 0
        ? Math.round(
            m.totalCents /
              salesWindow.filter(
                (s) =>
                  s.status === "CONFIRMED" &&
                  new Date(s.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }) === m.label,
              ).length,
          )
        : 0,
  }))
  const activeRevenueGoal = (() => {
    const parsed = Number(goalRevenueInput.replace(",", "."))
    if (!Number.isFinite(parsed) || parsed <= 0) return metrics.goals.revenueGoal
    return Math.round(parsed * 100)
  })()
  const activeOrdersGoal = (() => {
    const parsed = Number(goalOrdersInput)
    if (!Number.isFinite(parsed) || parsed <= 0) return metrics.goals.ordersGoal
    return Math.round(parsed)
  })()
  const revenueGoalProgress = Math.min(100, Math.round((metrics.revenue / Math.max(activeRevenueGoal, 1)) * 100))
  const ordersGoalProgress = Math.min(100, Math.round((metrics.orders / Math.max(activeOrdersGoal, 1)) * 100))

  async function handleSaveGoal() {
    const parsedRevenue = Number(goalRevenueInput.replace(",", "."))
    const parsedOrders = Number(goalOrdersInput)
    const revenueCents = Number.isFinite(parsedRevenue) && parsedRevenue > 0 ? Math.round(parsedRevenue * 100) : 0
    const ordersCount = Number.isFinite(parsedOrders) && parsedOrders > 0 ? Math.round(parsedOrders) : 0

    setSavingGoal(true)
    const res = await saveSalesGoal({
      year: goal.year,
      month: goal.month,
      revenueCents,
      ordersCount,
    })
    setSavingGoal(false)

    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success("Meta mensal salva.")
  }

  function exportCsv() {
    const rows = [
      ["Indicador", "Valor"],
      ["Periodo", `${days} dias`],
      ["Faturamento", (metrics.revenue / 100).toFixed(2)],
      ["Pedidos confirmados", String(metrics.orders)],
      ["Ticket medio", (metrics.ticket / 100).toFixed(2)],
      ["Conversao", metrics.conversionPct.toFixed(2)],
      ["Meta faturamento", (activeRevenueGoal / 100).toFixed(2)],
      ["Meta pedidos", String(activeOrdersGoal)],
    ]
    const csv = rows.map((r) => r.join(";")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `dashboard-vendas-${goal.year}-${String(goal.month).padStart(2, "0")}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function exportPdf() {
    const win = window.open("", "_blank")
    if (!win) {
      toast.error("Permita popup para gerar o PDF.")
      return
    }
    win.document.write(`
      <html>
        <head><title>Dashboard de vendas</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h2>Dashboard de vendas (${days} dias)</h2>
          <p>Faturamento: ${formatCentsToBrl(metrics.revenue)}</p>
          <p>Pedidos: ${metrics.orders}</p>
          <p>Ticket medio: ${formatCentsToBrl(metrics.ticket)}</p>
          <p>Conversao: ${metrics.conversionPct.toFixed(1)}%</p>
          <p>Meta faturamento: ${formatCentsToBrl(activeRevenueGoal)}</p>
          <p>Meta pedidos: ${activeOrdersGoal}</p>
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <ErpPageHeader
        title="Dashboard de vendas"
        description="Visão executiva para acompanhar desempenho comercial, conversão e carteira de clientes."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant={period === "7D" ? "default" : "outline"} onClick={() => setPeriod("7D")}>7 dias</Button>
            <Button variant={period === "30D" ? "default" : "outline"} onClick={() => setPeriod("30D")}>30 dias</Button>
            <Button variant={period === "90D" ? "default" : "outline"} onClick={() => setPeriod("90D")}>90 dias</Button>
            <Button variant="outline" onClick={exportCsv}><Download className="mr-2 size-4" />CSV</Button>
            <Button variant="outline" onClick={exportPdf}><Download className="mr-2 size-4" />PDF</Button>
            <Button variant="outline" asChild><Link href="/dashboard/vendas">Lista de vendas</Link></Button>
            <Button asChild><Link href="/dashboard/vendas/nova">+ Nova venda</Link></Button>
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Período ativo: {days} dias</Badge>
          <Badge variant="outline">Visão executiva</Badge>
          <Badge variant={metrics.conversionPct >= 60 ? "success" : "warning"}>
            Conversão {metrics.conversionPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={`Faturamento (${days}d)`} value={formatCentsToBrl(metrics.revenue)} trend={metrics.trends.revenue} icon={<Wallet className="size-4" />} />
        <KpiCard label="Pedidos confirmados" value={metrics.orders.toLocaleString("pt-BR")} trend={metrics.trends.orders} icon={<ShoppingCart className="size-4" />} />
        <KpiCard label="Ticket médio" value={formatCentsToBrl(metrics.ticket)} trend={metrics.trends.ticket} icon={<TrendingUp className="size-4" />} />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-slate-500">Conversão comercial</CardTitle>
            <Target className="size-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight text-slate-900">{metrics.conversionPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</p>
            <p className="text-xs text-slate-500">confirmadas / (orçamentos + confirmadas + canceladas)</p>
          </CardContent>
        </Card>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-emerald-200/70 bg-emerald-50/40">
          <CardHeader><CardTitle className="text-base">Meta de faturamento ({days}d)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-600">Meta mensal editável.</p>
            <Input
              inputMode="decimal"
              value={goalRevenueInput}
              onChange={(e) => setGoalRevenueInput(e.target.value)}
              placeholder={(metrics.goals.revenueGoal / 100).toFixed(2)}
            />
            <p className="text-2xl font-bold text-slate-900">{formatCentsToBrl(activeRevenueGoal)}</p>
            <p className="text-xs text-slate-500">Realizado: {formatCentsToBrl(metrics.revenue)}</p>
            <div className="h-2 rounded-full bg-emerald-100">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${revenueGoalProgress}%` }} />
            </div>
            <p className="text-xs font-medium text-emerald-700">{revenueGoalProgress}% da meta</p>
          </CardContent>
        </Card>
        <Card className="border-sky-200/70 bg-sky-50/40">
          <CardHeader><CardTitle className="text-base">Meta de pedidos ({days}d)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-600">Meta mensal editável.</p>
            <Input
              inputMode="numeric"
              value={goalOrdersInput}
              onChange={(e) => setGoalOrdersInput(e.target.value)}
              placeholder={String(metrics.goals.ordersGoal)}
            />
            <p className="text-2xl font-bold text-slate-900">{activeOrdersGoal.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-slate-500">Realizado: {metrics.orders.toLocaleString("pt-BR")} pedidos</p>
            <div className="h-2 rounded-full bg-sky-100">
              <div className="h-2 rounded-full bg-sky-500" style={{ width: `${ordersGoalProgress}%` }} />
            </div>
            <p className="text-xs font-medium text-sky-700">{ordersGoalProgress}% da meta</p>
            <Button type="button" disabled={savingGoal} onClick={() => void handleSaveGoal()}>
              Salvar meta de {String(goal.month).padStart(2, "0")}/{goal.year}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5 border-slate-200/80 shadow-sm">
          <CardHeader><CardTitle className="text-base">Evolução de faturamento (12 meses)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <SimpleRevenueChart data={monthlyRevenue} />
            </div>
          </CardContent>
        </Card>
        <Card className="xl:col-span-3 border-slate-200/80 shadow-sm">
          <CardHeader><CardTitle className="text-base">Status no mês</CardTitle></CardHeader>
          <CardContent>
            <StatusDonut data={statusData} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-4 border-slate-200/80 shadow-sm">
          <CardHeader><CardTitle className="text-base">Pedidos x ticket (12 meses)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <SimpleOrdersTicketChart data={monthlyOrdersData} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top produtos (últimos 90 dias)</CardTitle></CardHeader>
          <CardContent>
            {metrics.topProducts.length === 0 ? (
              <p className="text-sm text-slate-500">Sem vendas confirmadas nesse período.</p>
            ) : (
              <div className="space-y-3">
                {metrics.topProducts.map((p) => {
                  const max = Math.max(...metrics.topProducts.map((x) => x.revenueCents), 1)
                  const width = Math.max(6, Math.round((p.revenueCents / max) * 100))
                  return (
                    <div key={p.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">{p.name}</span>
                        <span className="text-slate-600">{formatCentsToBrl(p.revenueCents)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top clientes (últimos 90 dias)</CardTitle></CardHeader>
          <CardContent>
            {metrics.topCustomers.length === 0 ? (
              <p className="text-sm text-slate-500">Sem clientes com vendas confirmadas no período.</p>
            ) : (
              <div className={erpTableWrap}>
                <table className="w-full text-sm">
                  <thead className={erpTableHead}>
                    <tr>
                      <th className="px-3 py-2">Cliente</th>
                      <th className="px-3 py-2 text-right">Pedidos</th>
                      <th className="px-3 py-2 text-right">Receita</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {metrics.topCustomers.map((c) => (
                      <tr key={c.name}>
                        <td className="px-3 py-2 font-medium text-slate-900">{c.name}</td>
                        <td className="px-3 py-2 text-right">
                          <Badge variant="secondary">{c.orders}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-900">{formatCentsToBrl(c.revenueCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SimpleRevenueChart({ data }: { data: { label: string; totalCents: number }[] }) {
  const max = Math.max(...data.map((d) => d.totalCents), 1)
  const allZero = data.every((d) => d.totalCents === 0)
  return (
    <div className="relative flex h-full items-end gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      {allZero ? (
        <p className="absolute left-3 top-2 text-xs font-medium text-slate-500">Sem faturamento no histórico carregado</p>
      ) : null}
      {data.map((d) => {
        const h = Math.max(8, Math.round((d.totalCents / max) * 100))
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-2">
            <div className="w-full rounded-t-md bg-emerald-500" style={{ height: `${h}%` }} title={`${d.label}: ${formatCentsToBrl(d.totalCents)}`} />
            <span className="text-[10px] text-slate-500">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function StatusDonut({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const p1 = total ? (data[0]!.value / total) * 100 : 0
  const p2 = total ? (data[1]!.value / total) * 100 : 0
  const gradient =
    total === 0
      ? "conic-gradient(#cbd5e1 0% 100%)"
      : `conic-gradient(${PIE_COLORS[0]} 0% ${p1}%, ${PIE_COLORS[1]} ${p1}% ${p1 + p2}%, ${PIE_COLORS[2]} ${p1 + p2}% 100%)`
  return (
    <div className="flex h-72 flex-col items-center justify-center gap-4">
      <div className="relative size-44 rounded-full" style={{ background: gradient }}>
        <div className="absolute inset-6 rounded-full bg-white" />
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-700">{total}</div>
      </div>
      <div className="grid w-full grid-cols-1 gap-1">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-2 text-slate-600">
              <span className="size-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i]! }} />
              {d.name}
            </span>
            <span className="font-medium text-slate-800">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SimpleOrdersTicketChart({
  data,
}: {
  data: { label: string; totalCents: number; orders: number; ticketCents: number }[]
}) {
  const maxOrders = Math.max(...data.map((d) => d.orders), 1)
  const maxTicket = Math.max(...data.map((d) => d.ticketCents), 1)
  const allZero = data.every((d) => d.orders === 0 && d.ticketCents === 0)
  return (
    <div className="relative flex h-full items-end gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      {allZero ? (
        <p className="absolute left-3 top-2 text-xs font-medium text-slate-500">Sem pedidos/ticket no histórico carregado</p>
      ) : null}
      {data.map((d) => {
        const ordersH = Math.max(6, Math.round((d.orders / maxOrders) * 100))
        const ticketH = Math.max(6, Math.round((d.ticketCents / maxTicket) * 100))
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-2">
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div className="w-1/2 rounded-t bg-blue-500/85" style={{ height: `${ordersH}%` }} title={`Pedidos: ${d.orders}`} />
              <div className="w-1/2 rounded-t bg-amber-500/85" style={{ height: `${ticketH}%` }} title={`Ticket: ${formatCentsToBrl(d.ticketCents)}`} />
            </div>
            <span className="text-[10px] text-slate-500">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

