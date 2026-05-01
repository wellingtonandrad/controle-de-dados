"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ErpPageHeader } from "@/app/(panel)/dashboard/_components/erp-page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { erpTableHead, erpTableWrap } from "@/lib/erp-shell"
import { addBomItem, addRoutingStep, createBillOfMaterial, createWorkCenter } from "../_actions/engineering-actions"

type ProductOption = { id: string; name: string; sku: string; itemType: string }
type WorkCenterRow = { id: string; name: string; code: string | null; capacityPerDayMin: number; active: boolean }
type BomRow = {
  id: string
  version: string
  product: { id: string; name: string; sku: string }
  items: { id: string; quantity: number; lossPercent: number; componentProduct: { name: string; sku: string } }[]
  routingSteps: { id: string; sequence: number; name: string; setupMin: number; cycleMin: number; workCenter: { name: string } }[]
}

export function EngineeringContent({
  products,
  workCenters,
  boms,
}: {
  products: ProductOption[]
  workCenters: WorkCenterRow[]
  boms: BomRow[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const [wcName, setWcName] = useState("")
  const [wcCode, setWcCode] = useState("")
  const [wcCap, setWcCap] = useState("480")

  const [bomProductId, setBomProductId] = useState("")
  const [bomVersion, setBomVersion] = useState("v1")
  const [bomNotes, setBomNotes] = useState("")

  const [itemBomId, setItemBomId] = useState("")
  const [itemProductId, setItemProductId] = useState("")
  const [itemQty, setItemQty] = useState("1")
  const [itemLoss, setItemLoss] = useState("0")

  const [stepBomId, setStepBomId] = useState("")
  const [stepWorkCenterId, setStepWorkCenterId] = useState("")
  const [stepSequence, setStepSequence] = useState("10")
  const [stepName, setStepName] = useState("")
  const [stepSetup, setStepSetup] = useState("0")
  const [stepCycle, setStepCycle] = useState("0")

  async function runAction<T extends { error?: string; ok?: true }>(fn: () => Promise<T>, success: string) {
    setPending(true)
    const res = await fn()
    setPending(false)
    if (res.error) return toast.error(res.error)
    toast.success(success)
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ErpPageHeader
        title="Engenharia"
        description="Cadastre centros de trabalho, estrutura de produto (BOM) e roteiro operacional."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Novo centro de trabalho</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={wcName} onChange={(e) => setWcName(e.target.value)} placeholder="Ex.: Corte Laser" />
            </div>
            <div className="space-y-1">
              <Label>Código (opcional)</Label>
              <Input value={wcCode} onChange={(e) => setWcCode(e.target.value)} placeholder="CL-01" />
            </div>
            <div className="space-y-1">
              <Label>Capacidade diária (min)</Label>
              <Input value={wcCap} onChange={(e) => setWcCap(e.target.value)} />
            </div>
            <Button
              className="w-full"
              disabled={pending}
              onClick={() =>
                runAction(
                  () => createWorkCenter({ name: wcName, code: wcCode || undefined, capacityPerDayMin: Number(wcCap) }),
                  "Centro de trabalho criado.",
                )
              }
            >
              Criar centro
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Nova BOM</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Produto pai</Label>
              <select className="h-10 w-full rounded-md border px-3 text-sm" value={bomProductId} onChange={(e) => setBomProductId(e.target.value)}>
                <option value="">Selecione...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Versão</Label>
              <Input value={bomVersion} onChange={(e) => setBomVersion(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input value={bomNotes} onChange={(e) => setBomNotes(e.target.value)} placeholder="Opcional" />
            </div>
            <Button
              className="w-full"
              disabled={pending}
              onClick={() =>
                runAction(
                  () => createBillOfMaterial({ productId: bomProductId, version: bomVersion, notes: bomNotes || undefined }),
                  "BOM criada.",
                )
              }
            >
              Criar BOM
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Adicionar componente (BOM)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>BOM</Label>
              <select className="h-10 w-full rounded-md border px-3 text-sm" value={itemBomId} onChange={(e) => setItemBomId(e.target.value)}>
                <option value="">Selecione...</option>
                {boms.map((b) => (
                  <option key={b.id} value={b.id}>{b.product.name} · {b.version}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Componente</Label>
              <select className="h-10 w-full rounded-md border px-3 text-sm" value={itemProductId} onChange={(e) => setItemProductId(e.target.value)}>
                <option value="">Selecione...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Qtd</Label>
                <Input value={itemQty} onChange={(e) => setItemQty(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Perda %</Label>
                <Input value={itemLoss} onChange={(e) => setItemLoss(e.target.value)} />
              </div>
            </div>
            <Button
              className="w-full"
              disabled={pending}
              onClick={() =>
                runAction(
                  () =>
                    addBomItem({
                      bomId: itemBomId,
                      componentProductId: itemProductId,
                      quantity: Number(itemQty),
                      lossPercent: Number(itemLoss),
                    }),
                  "Componente adicionado.",
                )
              }
            >
              Adicionar componente
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Adicionar etapa de roteiro</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="space-y-1 md:col-span-2">
            <Label>BOM</Label>
            <select className="h-10 w-full rounded-md border px-3 text-sm" value={stepBomId} onChange={(e) => setStepBomId(e.target.value)}>
              <option value="">Selecione...</option>
              {boms.map((b) => (
                <option key={b.id} value={b.id}>{b.product.name} · {b.version}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Centro</Label>
            <select className="h-10 w-full rounded-md border px-3 text-sm" value={stepWorkCenterId} onChange={(e) => setStepWorkCenterId(e.target.value)}>
              <option value="">Selecione...</option>
              {workCenters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Seq.</Label>
            <Input value={stepSequence} onChange={(e) => setStepSequence(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Setup (min)</Label>
            <Input value={stepSetup} onChange={(e) => setStepSetup(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Ciclo (min)</Label>
            <Input value={stepCycle} onChange={(e) => setStepCycle(e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Operação</Label>
            <Input value={stepName} onChange={(e) => setStepName(e.target.value)} placeholder="Ex.: Dobra CNC" />
          </div>
          <div className="md:col-span-3 flex items-end">
            <Button
              className="w-full"
              disabled={pending}
              onClick={() =>
                runAction(
                  () =>
                    addRoutingStep({
                      bomId: stepBomId,
                      workCenterId: stepWorkCenterId,
                      sequence: Number(stepSequence),
                      name: stepName,
                      setupMin: Number(stepSetup),
                      cycleMin: Number(stepCycle),
                    }),
                  "Etapa de roteiro adicionada.",
                )
              }
            >
              Adicionar etapa
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className={erpTableWrap}>
        <table className="w-full text-sm">
          <thead className={erpTableHead}>
            <tr>
              <th className="px-3 py-2">BOM</th>
              <th className="px-3 py-2">Componentes</th>
              <th className="px-3 py-2">Roteiro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {boms.map((bom) => (
              <tr key={bom.id}>
                <td className="px-3 py-3 align-top">
                  <p className="font-medium text-slate-900">{bom.product.name}</p>
                  <p className="text-xs text-slate-500">SKU {bom.product.sku} · versão {bom.version}</p>
                </td>
                <td className="px-3 py-3 align-top">
                  {bom.items.length === 0 ? (
                    <span className="text-xs text-slate-400">Sem componentes</span>
                  ) : (
                    <ul className="space-y-1">
                      {bom.items.map((it) => (
                        <li key={it.id} className="text-xs text-slate-700">
                          {it.componentProduct.name} ({it.componentProduct.sku}) · qtd {it.quantity.toLocaleString("pt-BR")} · perda {it.lossPercent.toLocaleString("pt-BR")}%
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  {bom.routingSteps.length === 0 ? (
                    <span className="text-xs text-slate-400">Sem etapas</span>
                  ) : (
                    <ul className="space-y-1">
                      {bom.routingSteps
                        .sort((a, b) => a.sequence - b.sequence)
                        .map((s) => (
                          <li key={s.id} className="text-xs text-slate-700">
                            {s.sequence} · {s.name} · {s.workCenter.name} (setup {s.setupMin}m / ciclo {s.cycleMin}m)
                          </li>
                        ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
