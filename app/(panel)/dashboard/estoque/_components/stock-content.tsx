"use client"

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  createStockItem,
  createStockMovement,
  removeServiceConsumption,
  upsertServiceConsumption,
} from "../_actions/stock"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  Info,
  ListOrdered,
  Package,
  PackagePlus,
  TrendingUp,
  Warehouse,
} from "lucide-react"
import { ErpPageHeader } from "@/app/(panel)/dashboard/_components/erp-page-header"
import { erpTableHead, erpTableWrap } from "@/lib/erp-shell"

type StockItem = {
  id: string
  name: string
  unit: string
  currentQuantity: number
  minimumQuantity: number
}

type Service = {
  id: string
  name: string
}

type ConsumptionRow = {
  id: string
  quantity: number
  service: { id: string; name: string }
  stockItem: { id: string; name: string; unit: string }
}

type MovementRow = {
  id: string
  kind: "IN" | "OUT" | "ADJUSTMENT" | "APPOINTMENT_CONSUMPTION"
  quantity: number
  note: string | null
  createdAt: string
  stockItem: { id: string; name: string; unit: string }
}

type MovementKindFilter = "" | MovementRow["kind"]

function formatDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function startOfLocalDayMs(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split("-").map(Number)
  if (!y || !m || !d) return NaN
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
}

function endOfLocalDayMs(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split("-").map(Number)
  if (!y || !m || !d) return NaN
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
}

interface StockContentProps {
  stockItems: StockItem[]
  services: Service[]
  consumptions: ConsumptionRow[]
  movements: MovementRow[]
}

type SortKey = "name" | "balance_desc" | "balance_asc"
type StatusFilter = "all" | "zero" | "low" | "ok"

function itemStockStatus(item: StockItem): "zero" | "low" | "ok" {
  if (item.currentQuantity === 0) return "zero"
  if (item.currentQuantity <= item.minimumQuantity) return "low"
  return "ok"
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function StockContent({
  stockItems,
  services,
  consumptions,
  movements,
}: StockContentProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("name")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const [itemName, setItemName] = useState("")
  const [itemUnit, setItemUnit] = useState("un")
  const [itemQty, setItemQty] = useState("0")
  const [itemMin, setItemMin] = useState("0")

  const [mvItemId, setMvItemId] = useState(stockItems[0]?.id ?? "")
  const [mvKind, setMvKind] = useState<"IN" | "OUT" | "ADJUSTMENT">("OUT")
  const [mvQty, setMvQty] = useState("")
  const [mvNote, setMvNote] = useState("")
  const [movementModalOpen, setMovementModalOpen] = useState(false)

  const [movementFilterItemId, setMovementFilterItemId] = useState("")
  const [movementFilterKind, setMovementFilterKind] = useState<MovementKindFilter>("")
  const [movementDateFrom, setMovementDateFrom] = useState("")
  const [movementDateTo, setMovementDateTo] = useState("")

  const [consServiceId, setConsServiceId] = useState(services[0]?.id ?? "")
  const [consItemId, setConsItemId] = useState(stockItems[0]?.id ?? "")
  const [consQty, setConsQty] = useState("")

  const zeroStockCount = useMemo(
    () => stockItems.filter((x) => x.currentQuantity === 0).length,
    [stockItems],
  )

  const lowStockNotZero = useMemo(
    () =>
      stockItems.filter(
        (x) => x.currentQuantity > 0 && x.currentQuantity <= x.minimumQuantity,
      ).length,
    [stockItems],
  )

  const withStockCount = useMemo(
    () => stockItems.filter((x) => x.currentQuantity > 0).length,
    [stockItems],
  )

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = q
      ? stockItems.filter((i) => i.name.toLowerCase().includes(q))
      : [...stockItems]

    if (statusFilter !== "all") {
      rows = rows.filter((i) => itemStockStatus(i) === statusFilter)
    }

    if (sort === "name") {
      rows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    } else if (sort === "balance_desc") {
      rows.sort((a, b) => b.currentQuantity - a.currentQuantity)
    } else if (sort === "balance_asc") {
      rows.sort((a, b) => a.currentQuantity - b.currentQuantity)
    }
    return rows
  }, [stockItems, search, sort, statusFilter])

  const filteredMovements = useMemo(() => {
    return movements.filter((mv) => {
      if (movementFilterItemId && mv.stockItem.id !== movementFilterItemId) return false
      if (movementFilterKind && mv.kind !== movementFilterKind) return false
      const t = new Date(mv.createdAt).getTime()
      if (movementDateFrom) {
        const from = startOfLocalDayMs(movementDateFrom)
        if (!Number.isNaN(from) && t < from) return false
      }
      if (movementDateTo) {
        const to = endOfLocalDayMs(movementDateTo)
        if (!Number.isNaN(to) && t > to) return false
      }
      return true
    })
  }, [movements, movementFilterItemId, movementFilterKind, movementDateFrom, movementDateTo])

  useEffect(() => {
    if (stockItems.length === 0) {
      setMvItemId("")
      setConsItemId("")
      return
    }
    if (!mvItemId || !stockItems.some((i) => i.id === mvItemId)) {
      setMvItemId(stockItems[0].id)
    }
    if (!consItemId || !stockItems.some((i) => i.id === consItemId)) {
      setConsItemId(stockItems[0].id)
    }
  }, [stockItems, mvItemId, consItemId])

  useEffect(() => {
    if (services.length === 0) {
      setConsServiceId("")
      return
    }
    if (!consServiceId || !services.some((s) => s.id === consServiceId)) {
      setConsServiceId(services[0].id)
    }
  }, [services, consServiceId])

  function refresh() {
    startTransition(() => router.refresh())
  }

  async function submitMovement() {
    const res = await createStockMovement({
      stockItemId: mvItemId,
      kind: mvKind,
      quantity: Number(mvQty || "0"),
      note: mvNote,
    })
    if (res.error) return toast.error(res.error)
    toast.success(res.data)
    setMvQty("")
    setMvNote("")
    setMovementModalOpen(false)
    refresh()
  }

  function applyMovementPresetDays(days: number) {
    const end = new Date()
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(end.getDate() - (days - 1))
    setMovementDateFrom(formatDateLocal(start))
    setMovementDateTo(formatDateLocal(end))
  }

  function clearMovementFilters() {
    setMovementFilterItemId("")
    setMovementFilterKind("")
    setMovementDateFrom("")
    setMovementDateTo("")
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10">
      <ErpPageHeader
        title="Estoque"
        description={`Lista de materiais logo abaixo. Lançamentos, cadastro e regras de consumo (${consumptions.length} regra(s)) seguem na página.`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/necessidades">Necessidades (MRP)</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/compras">Compras</Link>
            </Button>
          </>
        }
      />

      <StockFlowGuide />

      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-emerald-50/25 p-5 shadow-sm sm:p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Resumo rápido
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Package className="size-5" aria-hidden />}
            iconClass="bg-emerald-50 text-emerald-700 ring-emerald-100"
            label="Materiais ativos"
            value={String(stockItems.length)}
            hint="Itens cadastrados no estoque"
          />
          <KpiCard
            icon={<TrendingUp className="size-5" aria-hidden />}
            iconClass="bg-sky-50 text-sky-700 ring-sky-100"
            label="Com saldo"
            value={String(withStockCount)}
            hint="Saldo maior que zero"
          />
          <KpiCard
            icon={<AlertTriangle className="size-5" aria-hidden />}
            iconClass="bg-amber-50 text-amber-800 ring-amber-100"
            label="Estoque baixo"
            value={String(lowStockNotZero)}
            hint="Saldo &gt; 0 e ≤ mínimo"
            variant={lowStockNotZero > 0 ? "warning" : "default"}
          />
          <KpiCard
            icon={<Boxes className="size-5" aria-hidden />}
            iconClass="bg-red-50 text-red-800 ring-red-100"
            label="Sem estoque"
            value={String(zeroStockCount)}
            hint="Saldo zerado"
            variant={zeroStockCount > 0 ? "danger" : "default"}
          />
        </div>
      </div>

      <Card
        id="materiais-estoque"
        className="overflow-hidden rounded-2xl border-emerald-200/60 bg-white py-0 shadow-md ring-1 ring-emerald-100/80"
      >
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/90 via-white to-slate-50/80 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200/80">
                <Warehouse className="size-5" aria-hidden />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg tracking-tight">Seus materiais</CardTitle>
                  {stockItems.length > 0 ? (
                    <Badge variant="secondary" className="font-normal">
                      {filteredItems.length === stockItems.length
                        ? `${stockItems.length} cadastrado(s)`
                        : `Mostrando ${filteredItems.length} de ${stockItems.length}`}
                    </Badge>
                  ) : null}
                </div>
                <CardDescription className="mt-1 max-w-2xl text-sm">
                  Visão principal do estoque: nome, unidade, saldo, mínimo e status. Use a busca e os filtros para
                  achar um item rapidamente.
                </CardDescription>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 lg:max-w-xl lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
              <Input
                className="h-10 border-slate-200 bg-white lg:min-w-[12rem] lg:flex-1"
                placeholder="Buscar por nome…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar material por nome"
              />
              <select
                className={cn(selectClass, "h-10 border-slate-200 bg-white lg:w-44")}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                aria-label="Filtrar por status do estoque"
              >
                <option value="all">Status: todos</option>
                <option value="zero">Status: sem estoque</option>
                <option value="low">Status: estoque baixo</option>
                <option value="ok">Status: normal</option>
              </select>
              <select
                className={cn(selectClass, "h-10 border-slate-200 bg-white lg:w-48")}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label="Ordenar lista de materiais"
              >
                <option value="name">Ordenar: nome</option>
                <option value="balance_desc">Ordenar: saldo (maior)</option>
                <option value="balance_asc">Ordenar: saldo (menor)</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className={erpTableWrap}>
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className={erpTableHead}>
                  <th className="px-4 py-3 sm:px-6">Material</th>
                  <th
                    className="px-2 py-3 text-center"
                    title="Unidade de medida (ex.: un, caixa), não é a quantidade em estoque"
                  >
                    Un.
                  </th>
                  <th
                    className="px-2 py-3 text-right"
                    title="Quantidade que você tem agora nesta unidade"
                  >
                    Saldo
                  </th>
                  <th
                    className="px-2 py-3 text-right"
                    title="Alerta quando o saldo for menor ou igual a este valor"
                  >
                    Mín.
                  </th>
                  <th className="px-4 py-3 text-right sm:px-6">Status</th>
                </tr>
              </thead>
              <tbody>
                {stockItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                      Ainda não há materiais. Use o formulário <strong className="text-foreground">Novo material</strong>{" "}
                      (painel ao lado no desktop ou abaixo no celular) para cadastrar o primeiro item — ele aparecerá
                      aqui na hora.
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                      {search.trim()
                        ? "Nenhum material corresponde à busca. Limpe o texto ou ajuste o filtro de status."
                        : statusFilter !== "all"
                          ? "Nenhum material neste status. Escolha outro filtro ou “todos”."
                          : "Nenhum material na lista."}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const semEstoque = item.currentQuantity === 0
                    const baixo =
                      !semEstoque && item.currentQuantity <= item.minimumQuantity
                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          "border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/80",
                          semEstoque && "bg-red-50/50",
                          baixo && "bg-amber-50/70",
                        )}
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-900 sm:px-6">{item.name}</td>
                        <td className="px-2 py-2.5 text-center text-muted-foreground">{item.unit}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{item.currentQuantity}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                          {item.minimumQuantity}
                        </td>
                        <td className="px-4 py-2.5 text-right sm:px-6">
                          {semEstoque ? (
                            <Badge variant="destructive">Sem estoque</Badge>
                          ) : baixo ? (
                            <Badge variant="warning">Baixo</Badge>
                          ) : (
                            <Badge variant="success">Normal</Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 xl:grid-cols-12">
        <div className="space-y-8 xl:col-span-8">
          <Card className="overflow-hidden rounded-2xl border-slate-200/90 py-0 shadow-md">
            <CardHeader className="border-b border-slate-100 bg-slate-50/90 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200/80">
                    <ListOrdered className="size-5" aria-hidden />
                  </span>
                  <div>
                    <CardTitle className="text-lg tracking-tight">Lançamentos</CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      Histórico completo: entradas, saídas, ajustes e consumo por consulta.
                    </CardDescription>
                  </div>
                </div>
                <Dialog open={movementModalOpen} onOpenChange={setMovementModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="shrink-0 gap-2" disabled={pending || stockItems.length === 0}>
                      <PackagePlus className="size-4" aria-hidden />
                      Novo lançamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo lançamento de estoque</DialogTitle>
                      <DialogDescription>
                        Por padrão use <strong>Saída</strong>: a quantidade informada é{" "}
                        <strong>subtraída</strong> do saldo do material. Entrada soma ao saldo;
                        ajuste define o saldo final (não é subtração).
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="mv-item-modal">Material</Label>
                        <select
                          id="mv-item-modal"
                          className={selectClass}
                          value={mvItemId}
                          onChange={(e) => setMvItemId(e.target.value)}
                        >
                          <option value="">Selecione…</option>
                          {stockItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="mv-kind-modal">Tipo</Label>
                          <select
                            id="mv-kind-modal"
                            className={selectClass}
                            value={mvKind}
                            onChange={(e) =>
                              setMvKind(e.target.value as "IN" | "OUT" | "ADJUSTMENT")
                            }
                          >
                            <option value="OUT">Saída (subtrai do saldo)</option>
                            <option value="IN">Entrada (soma ao saldo)</option>
                            <option value="ADJUSTMENT">Ajuste (define o saldo final)</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="mv-qty-modal">
                            {mvKind === "OUT"
                              ? "Quantidade a retirar"
                              : mvKind === "IN"
                                ? "Quantidade a entrar"
                                : "Novo saldo (total)"}
                          </Label>
                          <Input
                            id="mv-qty-modal"
                            type="number"
                            min={0}
                            value={mvQty}
                            onChange={(e) => setMvQty(e.target.value)}
                          />
                          <FieldHint>
                            {mvKind === "OUT"
                              ? "Esse valor será subtraído do saldo atual do material."
                              : mvKind === "IN"
                                ? "Esse valor será somado ao saldo atual do material."
                                : "O saldo passa a ser exatamente este número (não soma nem subtrai)."}
                          </FieldHint>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="mv-note-modal">Observação</Label>
                        <Input
                          id="mv-note-modal"
                          value={mvNote}
                          onChange={(e) => setMvNote(e.target.value)}
                          placeholder="Opcional"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setMovementModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="button" disabled={pending || !mvItemId} onClick={submitMovement}>
                        Salvar lançamento
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-0 p-0">
              <div className="space-y-2 border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mv-filter-item">Material</Label>
                    <select
                      id="mv-filter-item"
                      className={selectClass}
                      value={movementFilterItemId}
                      onChange={(e) => setMovementFilterItemId(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {stockItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mv-filter-kind">Tipo</Label>
                    <select
                      id="mv-filter-kind"
                      className={selectClass}
                      value={movementFilterKind}
                      onChange={(e) => setMovementFilterKind(e.target.value as MovementKindFilter)}
                    >
                      <option value="">Todos</option>
                      <option value="IN">Entrada</option>
                      <option value="OUT">Saída</option>
                      <option value="ADJUSTMENT">Ajuste</option>
                      <option value="APPOINTMENT_CONSUMPTION">Consumo consulta</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mv-filter-from">Data inicial</Label>
                    <Input
                      id="mv-filter-from"
                      type="date"
                      value={movementDateFrom}
                      onChange={(e) => setMovementDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mv-filter-to">Data final</Label>
                    <Input
                      id="mv-filter-to"
                      type="date"
                      value={movementDateTo}
                      onChange={(e) => setMovementDateTo(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => applyMovementPresetDays(7)}>
                    Últimos 7 dias
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => applyMovementPresetDays(30)}>
                    Últimos 30 dias
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={clearMovementFilters}>
                    Limpar filtros
                  </Button>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Mostrando {filteredMovements.length} de {movements.length}
                  </span>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <div className={cn(erpTableWrap, "max-h-[min(28rem,55vh)] overflow-auto")}>
                  <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className={erpTableHead}>
                      <th className="px-4 py-3 text-left sm:px-6">Data</th>
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-2 py-3 text-left">Tipo</th>
                      <th className="px-2 py-3 text-right">Quantidade</th>
                      <th className="px-4 py-3 text-left sm:px-6">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                          Nenhum lançamento registrado.
                        </td>
                      </tr>
                    ) : filteredMovements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                          Nenhum lançamento corresponde aos filtros.
                        </td>
                      </tr>
                    ) : (
                      filteredMovements.map((mv) => (
                        <tr key={mv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                          <td className="px-4 py-2.5 text-xs text-muted-foreground sm:px-6">
                            {new Date(mv.createdAt).toLocaleString("pt-BR")}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-medium text-slate-900">{mv.stockItem.name}</span>
                            <span className="ml-1 text-xs text-muted-foreground">({mv.stockItem.unit})</span>
                          </td>
                          <td className="px-2 py-2.5">
                            <Badge
                              variant={
                                mv.kind === "IN"
                                  ? "success"
                                  : mv.kind === "OUT" || mv.kind === "APPOINTMENT_CONSUMPTION"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {mv.kind === "IN"
                                ? "Entrada"
                                : mv.kind === "OUT"
                                  ? "Saída"
                                  : mv.kind === "ADJUSTMENT"
                                    ? "Ajuste"
                                    : "Consumo consulta"}
                            </Badge>
                          </td>
                          <td className="px-2 py-2.5 text-right tabular-nums font-medium text-slate-900">
                            {mv.quantity}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground sm:px-6">
                            {mv.note?.trim() || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="xl:col-span-4">
          <div className="space-y-5 xl:sticky xl:top-4 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto xl:rounded-2xl xl:border xl:border-slate-200/90 xl:bg-gradient-to-b xl:from-white xl:to-slate-50/90 xl:p-5 xl:shadow-sm">
            <Card className="rounded-xl border-slate-200/90 py-4 shadow-sm">
              <CardHeader className="px-4 pb-2 pt-0 sm:px-6">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <PackagePlus className="size-4" aria-hidden />
                  </span>
                  <div>
                    <CardTitle className="text-base">Novo material</CardTitle>
                    <CardDescription className="text-xs">
                      Cada material tem um nome único na empresa.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-4 sm:px-6">
                <div className="space-y-1.5">
                  <Label htmlFor="stock-name">Nome</Label>
                  <Input
                    id="stock-name"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Ex.: Luva M"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="stock-unit">Unidade de medida</Label>
                    <Input
                      id="stock-unit"
                      value={itemUnit}
                      onChange={(e) => setItemUnit(e.target.value)}
                      placeholder="un, cx, ml…"
                    />
                    <FieldHint>
                      Só o nome da medida (como você conta), não é quanto tem
                      em estoque.
                    </FieldHint>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stock-min">Estoque mínimo (alerta)</Label>
                    <Input
                      id="stock-min"
                      type="number"
                      value={itemMin}
                      onChange={(e) => setItemMin(e.target.value)}
                    />
                    <FieldHint>
                      Quando o saldo for ≤ este valor, o material aparece em
                      atenção.
                    </FieldHint>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stock-qty">Saldo inicial</Label>
                  <Input
                    id="stock-qty"
                    type="number"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                  />
                  <FieldHint>
                    Quantidade que você tem agora, expressa na unidade acima
                    (ex.: 20 un).
                  </FieldHint>
                </div>
                <Button
                  className="w-full gap-2"
                  disabled={pending}
                  onClick={async () => {
                    const res = await createStockItem({
                      name: itemName,
                      unit: itemUnit || "un",
                      currentQuantity: Number(itemQty || "0"),
                      minimumQuantity: Number(itemMin || "0"),
                    })
                    if (res.error) return toast.error(res.error)
                    toast.success(res.data)
                    setItemName("")
                    setItemUnit("un")
                    setItemQty("0")
                    setItemMin("0")
                    refresh()
                  }}
                >
                  Cadastrar material
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-sky-200/80 bg-sky-50/40 py-4 shadow-sm ring-1 ring-sky-100/80">
              <CardHeader className="px-4 pb-2 pt-0 sm:px-6">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm ring-1 ring-sky-100">
                    <Info className="size-4" aria-hidden />
                  </span>
                  <div>
                    <CardTitle className="text-base">Consumo por serviço</CardTitle>
                    <CardDescription className="text-xs">
                      Regras ao concluir consulta em Agendamentos.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-4 sm:px-6">
                <p className="rounded-lg border border-sky-100 bg-white/80 px-3 py-2 text-xs leading-relaxed text-sky-950">
                  Defina quanto de cada <strong>material</strong> sai do saldo quando um{" "}
                  <strong>serviço</strong> tiver consulta marcada como <strong>Concluída</strong>. A baixa só ocorre na
                  conclusão; sem saldo, o sistema bloqueia.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="cons-svc">Serviço (tipo de consulta)</Label>
                  <select
                    id="cons-svc"
                    className={selectClass}
                    value={consServiceId}
                    onChange={(e) => setConsServiceId(e.target.value)}
                  >
                    <option value="">Selecione…</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cons-item">Material</Label>
                  <select
                    id="cons-item"
                    className={selectClass}
                    value={consItemId}
                    onChange={(e) => setConsItemId(e.target.value)}
                  >
                    <option value="">Selecione…</option>
                    {stockItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cons-qty">
                    Quantidade a descontar por consulta concluída
                  </Label>
                  <Input
                    id="cons-qty"
                    type="number"
                    value={consQty}
                    onChange={(e) => setConsQty(e.target.value)}
                    min={0}
                  />
                  <FieldHint>
                    Cada vez que uma consulta deste serviço for concluída,
                    este valor sai do saldo deste material (na unidade do
                    material).
                  </FieldHint>
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={pending || !consServiceId || !consItemId}
                  onClick={async () => {
                    const res = await upsertServiceConsumption({
                      serviceId: consServiceId,
                      stockItemId: consItemId,
                      quantity: Number(consQty || "0"),
                    })
                    if (res.error) return toast.error(res.error)
                    toast.success(res.data)
                    setConsQty("")
                    refresh()
                  }}
                >
                  Salvar regra de consumo
                </Button>

                <div className="border-t pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Regras ativas (aplicadas ao concluir consulta)
                  </p>
                  {consumptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma regra ainda. Sem vínculos, concluir uma consulta
                      não altera o estoque.
                    </p>
                  ) : (
                    <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
                      {consumptions.map((row) => (
                        <li
                          key={row.id}
                          className="flex items-start justify-between gap-2 rounded-md border bg-muted/20 px-2 py-2"
                        >
                          <span>
                            <span className="font-medium">
                              {row.service.name}
                            </span>
                            <span className="text-muted-foreground"> → </span>
                            {row.quantity} {row.stockItem.unit}{" "}
                            {row.stockItem.name}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 shrink-0 px-2 text-xs"
                            disabled={pending}
                            onClick={async () => {
                              const res = await removeServiceConsumption(row.id)
                              if (res.error) return toast.error(res.error)
                              toast.success(res.data)
                              refresh()
                            }}
                          >
                            Remover
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  )
}

function FieldHint({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] leading-snug text-muted-foreground">{children}</p>
  )
}

function StockFlowGuide() {
  return (
    <details className="group rounded-2xl border border-slate-200/90 bg-white shadow-sm open:shadow-md">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-left sm:px-6 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200/80">
            <Info className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Como usar esta tela</p>
            <p className="text-xs text-muted-foreground">Clique para ver o passo a passo.</p>
          </div>
        </div>
        <ChevronDown className="size-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-slate-100 px-5 pb-5 pt-2 sm:px-6">
        <ol className="list-decimal space-y-2.5 pl-4 text-xs leading-relaxed text-muted-foreground marker:font-medium marker:text-foreground sm:text-sm">
          <li>
            <strong className="text-foreground">Materiais</strong> — a lista principal fica logo abaixo do resumo.
            Cadastre cada item com <strong className="text-foreground">unidade</strong> (un, caixa…) e{" "}
            <strong className="text-foreground">saldo</strong> atual; use busca e filtro de status para achar itens.
          </li>
          <li>
            <strong className="text-foreground">Lançamentos</strong> — entradas somam, saídas subtraem; ajuste define o
            saldo final.
          </li>
          <li>
            <strong className="text-foreground">Consumo por serviço</strong> — vincula material a serviço para baixa
            automática ao marcar consulta como <strong className="text-foreground">Concluída</strong>.
          </li>
          <li>
            Se faltar saldo na conclusão, o sistema <strong className="text-foreground">bloqueia</strong> até regularizar
            estoque ou a regra.
          </li>
        </ol>
      </div>
    </details>
  )
}

function KpiCard({
  icon,
  iconClass,
  label,
  value,
  hint,
  variant = "default",
}: {
  icon: ReactNode
  iconClass: string
  label: string
  value: string
  hint: string
  variant?: "default" | "warning" | "danger"
}) {
  return (
    <div
      className={cn(
        "flex gap-4 rounded-xl border border-slate-200/90 bg-white/90 p-4 shadow-sm backdrop-blur-sm",
        variant === "warning" && "border-amber-200/90 bg-amber-50/60",
        variant === "danger" && "border-red-200/90 bg-red-50/60",
      )}
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
          iconClass,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900",
            variant === "warning" && "text-amber-950",
            variant === "danger" && "text-red-900",
          )}
        >
          {value}
        </p>
        <p className="mt-1 text-xs leading-snug text-slate-600">{hint}</p>
      </div>
    </div>
  )
}
