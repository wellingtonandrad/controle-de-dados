"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ErpPageHeader } from "@/app/(panel)/dashboard/_components/erp-page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { erpTableHead, erpTableWrap } from "@/lib/erp-shell"
import { addProductionReport, createProductionOrder, updateProductionOrderStatus } from "../_actions/production-actions"

type BomOption = { id: string; version: string; productId: string; product: { name: string; sku: string } }
type WorkCenterOption = { id: string; name: string; capacityPerDayMin?: number }
type OrderRow = {
  id: string
  status: "PLANNED" | "RELEASED" | "IN_PROGRESS" | "PAUSED" | "FINISHED" | "CANCELLED"
  plannedQuantity: number
  producedQuantity: number
  scrapQuantity: number
  product: { name: string; sku: string }
  bom: { version: string }
  remainingQty: number
  estimatedMinutes: number
  materialRequirements: { name: string; quantity: number }[]
  materialConsumption: { name: string; planned: number; consumed: number }[]
  createdAt: string
  reports: { id: string; goodQuantity: number; scrapQuantity: number; runtimeMin: number; createdAt: string }[]
}

const STATUS_LABEL: Record<OrderRow["status"], string> = {
  PLANNED: "Planejada",
  RELEASED: "Liberada",
  IN_PROGRESS: "Em produção",
  PAUSED: "Pausada",
  FINISHED: "Finalizada",
  CANCELLED: "Cancelada",
}

export function ProductionContent({
  boms,
  workCenters,
  orders,
  planningSummary,
}: {
  boms: BomOption[]
  workCenters: WorkCenterOption[]
  orders: OrderRow[]
  planningSummary: {
    openOrdersCount: number
    totalEstimatedMinutes: number
    weeklyCapacityMinutes: number
    utilizationPct: number
  }
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const [bomId, setBomId] = useState("")
  const [productId, setProductId] = useState("")
  const [plannedQty, setPlannedQty] = useState("1")
  const [plannedStart, setPlannedStart] = useState("")
  const [plannedEnd, setPlannedEnd] = useState("")
  const [notes, setNotes] = useState("")

  const [reportOrderId, setReportOrderId] = useState("")
  const [reportWorkCenterId, setReportWorkCenterId] = useState("")
  const [goodQty, setGoodQty] = useState("0")
  const [scrapQty, setScrapQty] = useState("0")
  const [runtimeMin, setRuntimeMin] = useState("0")
  const [reportNotes, setReportNotes] = useState("")

  async function runAction<T extends { error?: string; ok?: true }>(fn: () => Promise<T>, success: string) {
    setPending(true)
    const res = await fn()
    setPending(false)
    if (res.error) return toast.error(res.error)
    toast.success(success)
    router.refresh()
  }

  const loadTone =
    planningSummary.utilizationPct > 100
      ? "text-red-700"
      : planningSummary.utilizationPct > 85
        ? "text-amber-700"
        : "text-emerald-700"

  const plannedQtyNum = Number(plannedQty)
  const canCreateOp = useMemo(() => {
    return (
      Boolean(bomId && productId) &&
      Number.isFinite(plannedQtyNum) &&
      plannedQtyNum > 0 &&
      Math.floor(plannedQtyNum) === plannedQtyNum
    )
  }, [bomId, productId, plannedQtyNum])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ErpPageHeader
        title="Produção"
        description="Abra ordens de produção e faça apontamentos de quantidade, refugo e tempo real."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">OPs abertas</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{planningSummary.openOrdersCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Carga estimada</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {planningSummary.totalEstimatedMinutes.toLocaleString("pt-BR")} min
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Capacidade semanal</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {planningSummary.weeklyCapacityMinutes.toLocaleString("pt-BR")} min
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Utilização prevista</p>
            <p className={`mt-1 text-2xl font-semibold ${loadTone}`}>
              {planningSummary.utilizationPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova ordem de produção</CardTitle>
            <CardDescription>
              Escolha uma <strong>BOM ativa</strong> (cadastrada em Engenharia), informe a quantidade a fabricar e clique
              em Criar OP.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {boms.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-3 text-sm text-amber-950">
                <p className="font-medium">Não há BOM disponível aqui.</p>
                <p className="mt-1 text-xs leading-relaxed">
                  Cadastre um produto acabado em <strong>Produtos</strong>, depois em{" "}
                  <Link href="/dashboard/engenharia" className="font-semibold text-amber-900 underline underline-offset-2">
                    Engenharia
                  </Link>{" "}
                  crie uma <strong>lista de materiais (BOM)</strong> marcada como ativa. Volte em Produção e a BOM aparecerá
                  no campo abaixo.
                </p>
              </div>
            ) : null}
            <div className="space-y-1">
              <Label>BOM</Label>
              <select
                className="h-10 w-full rounded-md border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                value={bomId}
                disabled={boms.length === 0}
                onChange={(e) => {
                  const selected = boms.find((b) => b.id === e.target.value)
                  setBomId(e.target.value)
                  setProductId(selected?.productId ?? "")
                }}
              >
                <option value="">Selecione uma BOM…</option>
                {boms.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.product.name} ({b.product.sku}) · {b.version}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Quantidade</Label>
                <Input value={plannedQty} onChange={(e) => setPlannedQty(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Início (opcional)</Label>
                <Input type="datetime-local" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Fim (opcional)</Label>
                <Input type="datetime-local" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
            </div>
            <Button
              className="w-full"
              disabled={pending || !canCreateOp}
              onClick={() =>
                runAction(
                  () =>
                    createProductionOrder({
                      bomId,
                      productId,
                      plannedQuantity: plannedQtyNum,
                      plannedStart: plannedStart || undefined,
                      plannedEnd: plannedEnd || undefined,
                      notes: notes || undefined,
                    }),
                  "Ordem de produção criada.",
                )
              }
            >
              Criar OP
            </Button>
            {!canCreateOp && boms.length > 0 ? (
              <p className="text-center text-xs text-muted-foreground">
                Selecione uma BOM e uma quantidade inteira maior que zero.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Apontar produção</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Ordem de produção</Label>
              <select className="h-10 w-full rounded-md border px-3 text-sm" value={reportOrderId} onChange={(e) => setReportOrderId(e.target.value)}>
                <option value="">Selecione...</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.product.name} · {o.bom.version} · {STATUS_LABEL[o.status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Centro de trabalho (opcional)</Label>
              <select className="h-10 w-full rounded-md border px-3 text-sm" value={reportWorkCenterId} onChange={(e) => setReportWorkCenterId(e.target.value)}>
                <option value="">Selecione...</option>
                {workCenters.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>Boa</Label>
                <Input value={goodQty} onChange={(e) => setGoodQty(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Refugo</Label>
                <Input value={scrapQty} onChange={(e) => setScrapQty(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Tempo (min)</Label>
                <Input value={runtimeMin} onChange={(e) => setRuntimeMin(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input value={reportNotes} onChange={(e) => setReportNotes(e.target.value)} placeholder="Opcional" />
            </div>
            <Button
              className="w-full"
              disabled={pending}
              onClick={() =>
                runAction(
                  () =>
                    addProductionReport({
                      productionOrderId: reportOrderId,
                      workCenterId: reportWorkCenterId || undefined,
                      goodQuantity: Number(goodQty),
                      scrapQuantity: Number(scrapQty),
                      runtimeMin: Number(runtimeMin),
                      notes: reportNotes || undefined,
                    }),
                  "Apontamento registrado.",
                )
              }
            >
              Registrar apontamento
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className={erpTableWrap}>
        <table className="w-full text-sm">
          <thead className={erpTableHead}>
            <tr>
              <th className="px-3 py-2">Produto / BOM</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Planejado</th>
              <th className="px-3 py-2">Produzido</th>
              <th className="px-3 py-2">Refugo</th>
              <th className="px-3 py-2">Necessidade / consumo</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="px-3 py-3">
                  <p className="font-medium text-slate-900">{o.product.name}</p>
                  <p className="text-xs text-slate-500">SKU {o.product.sku} · {o.bom.version}</p>
                </td>
                <td className="px-3 py-3">
                  <Badge variant={o.status === "FINISHED" ? "success" : o.status === "CANCELLED" ? "destructive" : "secondary"}>
                    {STATUS_LABEL[o.status]}
                  </Badge>
                </td>
                <td className="px-3 py-3">{o.plannedQuantity.toLocaleString("pt-BR")}</td>
                <td className="px-3 py-3">{o.producedQuantity.toLocaleString("pt-BR")}</td>
                <td className="px-3 py-3">{o.scrapQuantity.toLocaleString("pt-BR")}</td>
                <td className="px-3 py-3 align-top">
                  <p className="text-xs text-slate-500">
                    Falta produzir: {o.remainingQty.toLocaleString("pt-BR")} · carga:{" "}
                    {o.estimatedMinutes.toLocaleString("pt-BR")} min
                  </p>
                  {o.materialRequirements.length === 0 ? (
                    <p className="text-xs text-slate-400">Sem componentes</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {o.materialRequirements.slice(0, 3).map((m) => (
                        <li key={`${o.id}-${m.name}`} className="text-xs text-slate-700">
                          {m.name}: {m.quantity.toLocaleString("pt-BR")}
                        </li>
                      ))}
                      {o.materialRequirements.length > 3 ? (
                        <li className="text-xs text-slate-400">
                          +{o.materialRequirements.length - 3} componente(s)
                        </li>
                      ) : null}
                    </ul>
                  )}
                  {o.materialConsumption.length > 0 ? (
                    <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      Previsto vs realizado (OP)
                    </p>
                  ) : null}
                  {o.materialConsumption.length > 0 ? (
                    <ul className="mt-1 space-y-0.5">
                      {o.materialConsumption.slice(0, 3).map((m) => (
                        <li key={`${o.id}-cons-${m.name}`} className="text-xs text-slate-600">
                          {m.name}: {m.consumed.toLocaleString("pt-BR")} / {m.planned.toLocaleString("pt-BR")}
                        </li>
                      ))}
                      {o.materialConsumption.length > 3 ? (
                        <li className="text-xs text-slate-400">
                          +{o.materialConsumption.length - 3} linha(s)
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => runAction(() => updateProductionOrderStatus({ productionOrderId: o.id, status: "RELEASED" }), "OP liberada.")}>
                      Liberar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => runAction(() => updateProductionOrderStatus({ productionOrderId: o.id, status: "IN_PROGRESS" }), "OP em produção.")}>
                      Iniciar
                    </Button>
                    <Button size="sm" onClick={() => runAction(() => updateProductionOrderStatus({ productionOrderId: o.id, status: "FINISHED" }), "OP finalizada.")}>
                      Finalizar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
