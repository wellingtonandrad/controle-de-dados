"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  MOCK_OPERATION_LOTS,
  LOT_STATUS_LABEL,
  formatLotProgress,
  suggestNextLotCode,
  type MockOperationLot,
  type LotStatus,
} from "@/lib/logistics/mock-operation-lots"
import { erpTableHead, erpTableWrap } from "@/lib/erp-shell"
import { cn } from "@/lib/utils"
import { ArrowRight, ClipboardList, Plus } from "lucide-react"

function statusBadgeVariant(status: LotStatus): "default" | "secondary" | "outline" {
  if (status === "FINALIZADO") return "secondary"
  if (status === "EM_COLETA") return "default"
  return "outline"
}

function formatWhen(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function LotesEscritorioPrototype() {
  const [lots, setLots] = useState<MockOperationLot[]>(() => [...MOCK_OPERATION_LOTS])
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_OPERATION_LOTS[2]?.id ?? null)
  const [newSkuCount, setNewSkuCount] = useState("40")
  const [newNotes, setNewNotes] = useState("")

  const selected = useMemo(
    () => lots.find((l) => l.id === selectedId) ?? null,
    [lots, selectedId],
  )

  const nextCode = useMemo(() => suggestNextLotCode(lots), [lots])

  function prototypeToast(action: string) {
    toast.info("Protótipo visual", {
      description: `${action} — ainda sem persistência no banco.`,
    })
  }

  function handleCreateLot() {
    const total = Math.max(1, parseInt(newSkuCount, 10) || 40)
    const lot: MockOperationLot = {
      id: `lot-${nextCode}`,
      code: nextCode,
      status: "LIBERADO",
      totalItems: total,
      collectedCount: 0,
      collectorName: null,
      startedAt: null,
      finishedAt: null,
      notes: newNotes.trim() || "Criado no protótipo (escritório).",
      items: Array.from({ length: Math.min(6, total) }, (_, n) => ({
        id: `${nextCode}-${n}`,
        sku: `SKU-${nextCode}-${n + 1}`,
        productName: `Item planejado ${n + 1}`,
        quantityPlanned: Math.ceil(total / 6),
        quantityCollected: 0,
        collected: false,
      })),
    }
    setLots((prev) => [lot, ...prev])
    setSelectedId(lot.id)
    setNewNotes("")
    prototypeToast(`Lote ${nextCode} adicionado à lista local`)
  }

  function handleRelease(lot: MockOperationLot) {
    setLots((prev) =>
      prev.map((l) =>
        l.id === lot.id
          ? { ...l, notes: l.notes ?? "Liberado para coleta na operação." }
          : l,
      ),
    )
    prototypeToast(`Lote ${lot.code} liberado para coleta`)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="rounded-2xl border-slate-200/90 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="size-4 text-emerald-600" aria-hidden />
              Novo lote (escritório / ERP)
            </CardTitle>
            <CardDescription>
              Número sequencial sugerido — no papel era 7005, 7006…; aqui só demonstração.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Próximo código
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-slate-900">{nextCode}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku-count">Quantidade de SKUs no lote</Label>
              <Input
                id="sku-count"
                type="number"
                min={1}
                value={newSkuCount}
                onChange={(e) => setNewSkuCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot-notes">Observação (opcional)</Label>
              <Input
                id="lot-notes"
                placeholder="Ex.: prioridade manhã, linha 2…"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>
            <Button type="button" className="w-full gap-2" onClick={handleCreateLot}>
              <Plus className="size-4" aria-hidden />
              Criar lote (protótipo)
            </Button>
            <p className="text-xs leading-relaxed text-slate-500">
              Fluxo futuro: engenharia/produção planeja → escritório libera → coletor executa na
              operação (sem autorizar fabricação).
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/90 shadow-sm lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4 text-emerald-600" aria-hidden />
              Lotes na operação
            </CardTitle>
            <CardDescription>Visão do planejador — progresso tipo 17/40.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <div className={erpTableWrap}>
              <table className="w-full text-sm">
                <thead className={erpTableHead}>
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Lote</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Progresso</th>
                    <th className="px-4 py-3 text-left font-medium">Coletor</th>
                    <th className="px-4 py-3 text-right font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot) => (
                    <tr
                      key={lot.id}
                      className={cn(
                        "border-t border-slate-100 transition-colors",
                        selectedId === lot.id && "bg-emerald-50/60",
                      )}
                    >
                      <td className="px-4 py-3 font-mono font-semibold">{lot.code}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant(lot.status)}>
                          {LOT_STATUS_LABEL[lot.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatLotProgress(lot.collectedCount, lot.totalItems)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {lot.collectorName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedId(lot.id)}
                        >
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {selected ? (
        <Card className="rounded-2xl border-slate-200/90 shadow-sm">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="font-mono text-xl">Lote {selected.code}</CardTitle>
              <CardDescription className="mt-1">
                {selected.notes ?? "Sem observações."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.status === "LIBERADO" ? (
                <Button type="button" variant="default" onClick={() => handleRelease(selected)}>
                  Liberar para coleta
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => prototypeToast("Exportar planilha")}
              >
                Exportar (em breve)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Status" value={LOT_STATUS_LABEL[selected.status]} />
            <Stat
              label="Progresso"
              value={formatLotProgress(selected.collectedCount, selected.totalItems)}
            />
            <Stat label="Início coleta" value={formatWhen(selected.startedAt)} />
            <Stat label="Fim coleta" value={formatWhen(selected.finishedAt)} />
          </CardContent>
          {selected.items.length > 0 ? (
            <CardContent className="border-t border-slate-100 pt-0">
              <p className="mb-3 text-sm font-medium text-slate-700">Amostra de SKUs (protótipo)</p>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {selected.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                  >
                    <div>
                      <span className="font-mono text-xs text-slate-500">{item.sku}</span>
                      <p className="font-medium text-slate-900">{item.productName}</p>
                    </div>
                    <span className="tabular-nums text-slate-600">
                      {item.quantityCollected}/{item.quantityPlanned}
                    </span>
                  </li>
                ))}
              </ul>
              {selected.totalItems > selected.items.length ? (
                <p className="mt-2 text-xs text-slate-500">
                  + {selected.totalItems - selected.items.length} itens omitidos na demo
                </p>
              ) : null}
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <Card className="rounded-2xl border-slate-200/60 bg-slate-50/50">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800">ERP → operação</p>
            <p className="text-xs text-slate-600">
              O escritório organiza e libera; o coletor só registra início, itens e fim — não
              autoriza produção.
            </p>
          </div>
          <ArrowRight className="hidden size-5 text-slate-400 sm:block" aria-hidden />
          <p className="text-xs text-slate-500 sm:max-w-xs sm:text-right">
            Na aba <strong>Coletor</strong>, simule a execução no chão de fábrica.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}
