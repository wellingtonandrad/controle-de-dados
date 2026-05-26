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
  type MockLotItem,
  type MockOperationLot,
} from "@/lib/logistics/mock-operation-lots"
import { cn } from "@/lib/utils"
import { Check, Circle, PackageSearch, Play, Square } from "lucide-react"

type CollectorPhase = "search" | "detail" | "collecting"

function buildDemoItems(lot: MockOperationLot): MockLotItem[] {
  if (lot.items.length > 0) return lot.items.map((i) => ({ ...i }))
  return Array.from({ length: Math.min(lot.totalItems, 8) }, (_, n) => ({
    id: `${lot.code}-demo-${n}`,
    sku: `SKU-${lot.code}-${n + 1}`,
    productName: `Produto ${n + 1}`,
    quantityPlanned: 1,
    quantityCollected: 0,
    collected: false,
  }))
}

export function ColetorPrototype({ displayName }: { displayName: string }) {
  const [phase, setPhase] = useState<CollectorPhase>("search")
  const [search, setSearch] = useState("")
  const [activeLot, setActiveLot] = useState<MockOperationLot | null>(null)
  const [items, setItems] = useState<MockLotItem[]>([])
  const [startedAt, setStartedAt] = useState<string | null>(null)

  const catalog = useMemo(() => [...MOCK_OPERATION_LOTS], [])

  const liberados = useMemo(
    () => catalog.filter((l) => l.status === "LIBERADO" || l.status === "EM_COLETA"),
    [catalog],
  )

  function prototypeToast(msg: string) {
    toast.info("Protótipo visual", { description: msg })
  }

  function openLot(lot: MockOperationLot) {
    setActiveLot(lot)
    setItems(buildDemoItems(lot))
    setStartedAt(lot.startedAt)
    setPhase(lot.status === "EM_COLETA" ? "collecting" : "detail")
    setSearch(lot.code)
  }

  function handleSearch() {
    const code = search.trim()
    const found =
      catalog.find((l) => l.code === code) ??
      catalog.find((l) => l.code.includes(code))
    if (!found) {
      toast.error("Lote não encontrado", {
        description: "Tente 7005 ou 7004 no protótipo.",
      })
      return
    }
    openLot(found)
  }

  function handleStart() {
    if (!activeLot) return
    const now = new Date().toISOString()
    setStartedAt(now)
    setPhase("collecting")
    prototypeToast(`Coleta do lote ${activeLot.code} iniciada (somente local)`)
  }

  function toggleItem(id: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const collected = !item.collected
        return {
          ...item,
          collected,
          quantityCollected: collected ? item.quantityPlanned : 0,
        }
      }),
    )
  }

  const collectedCount = items.filter((i) => i.collected).length
  const totalCount = activeLot?.totalItems ?? items.length

  function handleFinish() {
    if (!activeLot) return
    if (collectedCount < items.length) {
      toast.warning("Itens pendentes", {
        description: "No protótipo você pode finalizar mesmo assim.",
      })
    }
    prototypeToast(`Lote ${activeLot.code} finalizado — sem gravação no servidor`)
    setPhase("search")
    setActiveLot(null)
    setItems([])
    setStartedAt(null)
    setSearch("")
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-8">
      <Card className="rounded-2xl border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Modo coletor</CardTitle>
          <CardDescription>
            Operação no chão — lote, horário e progresso {formatLotProgress(collectedCount, totalCount || 40)}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Coletor: <span className="font-semibold text-slate-900">{displayName}</span>
          </p>
        </CardContent>
      </Card>

      {phase === "search" ? (
        <>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PackageSearch className="size-5 text-emerald-600" aria-hidden />
                Buscar lote
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lot-search">Número do lote</Label>
                <Input
                  id="lot-search"
                  inputMode="numeric"
                  placeholder="Ex.: 7005"
                  className="h-12 text-lg font-mono"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button type="button" className="h-12 w-full text-base" onClick={handleSearch}>
                Abrir lote
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Liberados (demo)
            </p>
            {liberados.map((lot) => (
              <button
                key={lot.id}
                type="button"
                onClick={() => openLot(lot)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <div>
                  <span className="font-mono text-lg font-bold text-slate-900">{lot.code}</span>
                  <p className="text-xs text-slate-500">{LOT_STATUS_LABEL[lot.status]}</p>
                </div>
                <Badge variant="outline">
                  {formatLotProgress(lot.collectedCount, lot.totalItems)}
                </Badge>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {activeLot && phase !== "search" ? (
        <Card className="rounded-2xl shadow-md">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="font-mono text-2xl">Lote {activeLot.code}</CardTitle>
                <CardDescription className="mt-1">
                  {activeLot.notes ?? `${totalCount} SKUs no lote`}
                </CardDescription>
              </div>
              <Badge>{LOT_STATUS_LABEL[phase === "collecting" ? "EM_COLETA" : activeLot.status]}</Badge>
            </div>
            {startedAt ? (
              <p className="text-xs text-slate-500">
                Início:{" "}
                {new Date(startedAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : null}
          </CardHeader>

          {phase === "detail" ? (
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm text-slate-600">
                Confira o lote antes de iniciar. No fluxo real, os dados vêm do ERP liberado pelo
                escritório.
              </p>
              <Button type="button" className="h-12 w-full gap-2 text-base" onClick={handleStart}>
                <Play className="size-5" aria-hidden />
                Iniciar coleta
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setPhase("search")
                  setActiveLot(null)
                }}
              >
                Voltar
              </Button>
            </CardContent>
          ) : null}

          {phase === "collecting" ? (
            <>
              <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">Progresso</span>
                  <span className="font-mono text-lg font-bold tabular-nums text-emerald-700">
                    {formatLotProgress(collectedCount, totalCount)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${totalCount ? Math.min(100, (collectedCount / totalCount) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
              <CardContent className="max-h-[50vh] space-y-2 overflow-y-auto p-3">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
                      item.collected
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    )}
                  >
                    {item.collected ? (
                      <Check className="size-5 shrink-0 text-emerald-600" aria-hidden />
                    ) : (
                      <Circle className="size-5 shrink-0 text-slate-300" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{item.productName}</p>
                      <p className="font-mono text-xs text-slate-500">{item.sku}</p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-slate-600">
                      {item.quantityPlanned} un.
                    </span>
                  </button>
                ))}
              </CardContent>
              <CardContent className="flex flex-col gap-2 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  className="h-12 w-full gap-2 text-base"
                  variant="default"
                  onClick={handleFinish}
                >
                  <Square className="size-4" aria-hidden />
                  Finalizar lote
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPhase("detail")}
                >
                  Pausar (protótipo)
                </Button>
              </CardContent>
            </>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
}
