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
  createStockItem,
  createStockMovement,
  removeServiceConsumption,
  upsertServiceConsumption,
} from "../_actions/stock"
import { cn } from "@/lib/utils"
import { Info } from "lucide-react"

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

interface StockContentProps {
  stockItems: StockItem[]
  services: Service[]
  consumptions: ConsumptionRow[]
}

type SortKey = "name" | "balance_desc" | "balance_asc"

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function StockContent({
  stockItems,
  services,
  consumptions,
}: StockContentProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("name")

  const [itemName, setItemName] = useState("")
  const [itemUnit, setItemUnit] = useState("un")
  const [itemQty, setItemQty] = useState("0")
  const [itemMin, setItemMin] = useState("0")

  const [mvItemId, setMvItemId] = useState(stockItems[0]?.id ?? "")
  const [mvKind, setMvKind] = useState<"IN" | "OUT" | "ADJUSTMENT">("IN")
  const [mvQty, setMvQty] = useState("")
  const [mvNote, setMvNote] = useState("")

  const [consServiceId, setConsServiceId] = useState(services[0]?.id ?? "")
  const [consItemId, setConsItemId] = useState(stockItems[0]?.id ?? "")
  const [consQty, setConsQty] = useState("")

  const lowStockCount = useMemo(
    () =>
      stockItems.filter((x) => x.currentQuantity <= x.minimumQuantity).length,
    [stockItems],
  )

  const okCount = stockItems.length - lowStockCount

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = q
      ? stockItems.filter((i) => i.name.toLowerCase().includes(q))
      : [...stockItems]

    if (sort === "name") {
      rows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    } else if (sort === "balance_desc") {
      rows.sort((a, b) => b.currentQuantity - a.currentQuantity)
    } else if (sort === "balance_asc") {
      rows.sort((a, b) => a.currentQuantity - b.currentQuantity)
    }
    return rows
  }, [stockItems, search, sort])

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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Estoque
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastre materiais, registre entradas e saídas e defina regras de
            consumo por tipo de consulta.
          </p>
        </div>
      </header>

      <StockFlowGuide />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Itens cadastrados"
          value={String(stockItems.length)}
          hint="Materiais ativos"
        />
        <KpiCard
          label="Em alerta"
          value={String(lowStockCount)}
          hint="Saldo ≤ mínimo"
          variant={lowStockCount > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Dentro do mínimo"
          value={String(okCount)}
          hint="Saldo acima do mínimo"
        />
        <KpiCard
          label="Vínculos de consumo"
          value={String(consumptions.length)}
          hint="Regras ao concluir consulta"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <Card className="overflow-hidden py-0">
            <CardHeader className="border-b bg-muted/40 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Materiais</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Saldo = quantidade hoje. Un. = como você conta (un, cx,
                    ml…).
                  </CardDescription>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Input
                    className="sm:w-56"
                    placeholder="Buscar por nome…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <select
                    className={cn(selectClass, "sm:w-44")}
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                  >
                    <option value="name">Ordenar: nome</option>
                    <option value="balance_desc">Ordenar: saldo (maior)</option>
                    <option value="balance_asc">Ordenar: saldo (menor)</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                        <td
                          colSpan={5}
                          className="px-6 py-10 text-center text-muted-foreground"
                        >
                          Cadastre o primeiro material no painel à direita.
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-10 text-center text-muted-foreground"
                        >
                          Nenhum material corresponde à busca.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const low =
                          item.currentQuantity <= item.minimumQuantity
                        return (
                          <tr
                            key={item.id}
                            className={cn(
                              "border-b last:border-0",
                              low && "bg-amber-50/60",
                            )}
                          >
                            <td className="px-4 py-2.5 font-medium sm:px-6">
                              {item.name}
                            </td>
                            <td className="px-2 py-2.5 text-center text-muted-foreground">
                              {item.unit}
                            </td>
                            <td className="px-2 py-2.5 text-right tabular-nums">
                              {item.currentQuantity}
                            </td>
                            <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                              {item.minimumQuantity}
                            </td>
                            <td className="px-4 py-2.5 text-right sm:px-6">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                  low
                                    ? "bg-amber-100 text-amber-900"
                                    : "bg-emerald-100 text-emerald-900",
                                )}
                              >
                                {low ? "Atenção" : "OK"}
                              </span>
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
        </div>

        <aside className="space-y-4 xl:col-span-4 xl:border-l xl:pl-6">
          <div className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-6rem)] xl:space-y-4 xl:overflow-y-auto">
            <Card className="py-4">
              <CardHeader className="px-4 pb-2 pt-0 sm:px-6">
                <CardTitle className="text-base">Novo material</CardTitle>
                <CardDescription className="text-xs">
                  Cada material tem um nome único na clínica.
                </CardDescription>
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
                  className="w-full"
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
                  Cadastrar
                </Button>
              </CardContent>
            </Card>

            <Card className="py-4">
              <CardHeader className="px-4 pb-2 pt-0 sm:px-6">
                <CardTitle className="text-base">Movimentação</CardTitle>
                <CardDescription className="text-xs">
                  Compras, uso avulso, perdas ou correção manual — independente
                  do consumo automático ao concluir consulta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 px-4 sm:px-6">
                <div className="space-y-1.5">
                  <Label htmlFor="mv-item">Material</Label>
                  <select
                    id="mv-item"
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
                    <Label htmlFor="mv-kind">Tipo</Label>
                    <select
                      id="mv-kind"
                      className={selectClass}
                      value={mvKind}
                      onChange={(e) =>
                        setMvKind(e.target.value as "IN" | "OUT" | "ADJUSTMENT")
                      }
                    >
                      <option value="IN">Entrada</option>
                      <option value="OUT">Saída</option>
                      <option value="ADJUSTMENT">Ajuste</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mv-qty">Quantidade</Label>
                    <Input
                      id="mv-qty"
                      type="number"
                      value={mvQty}
                      onChange={(e) => setMvQty(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mv-note">Observação</Label>
                  <Input
                    id="mv-note"
                    value={mvNote}
                    onChange={(e) => setMvNote(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={pending || !mvItemId}
                  onClick={async () => {
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
                    refresh()
                  }}
                >
                  Registrar
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/20 py-4 shadow-sm ring-1 ring-primary/10">
              <CardHeader className="px-4 pb-2 pt-0 sm:px-6">
                <CardTitle className="text-base">Consumo automático por serviço</CardTitle>
                <CardDescription className="text-xs">
                  Regras usadas quando a consulta é marcada como concluída em
                  Agendamentos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 px-4 sm:px-6">
                <div
                  className="flex gap-3 rounded-lg border border-sky-200 bg-sky-50/90 p-3 text-xs text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
                  role="note"
                >
                  <Info
                    className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400"
                    aria-hidden
                  />
                  <div className="space-y-2 leading-relaxed">
                    <p className="font-medium">
                      O sistema não detecta sozinho o que foi usado na cadeira.
                    </p>
                    <p>
                      Aqui você diz: para cada <strong>serviço</strong> da
                      clínica, quanto de cada <strong>material</strong> deve ser
                      <strong> descontado do saldo</strong> quando alguém
                      marcar aquela consulta como <strong>Concluída</strong>.
                    </p>
                    <p className="text-sky-900/90 dark:text-sky-100/90">
                      Salvar um vínculo só grava a regra. A baixa no estoque
                      acontece na conclusão da consulta. Se o saldo for
                      insuficiente, a conclusão é bloqueada até entrar estoque
                      ou ajustar a quantidade da regra.
                    </p>
                  </div>
                </div>
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
    <Card className="border-muted-foreground/25 bg-muted/30 py-4">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 px-4 pb-2 pt-0 sm:px-6">
        <Info
          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base">Como o estoque funciona aqui</CardTitle>
          <CardDescription className="text-xs leading-relaxed sm:text-sm">
            Resumo do que cada parte da tela faz, na ordem do dia a dia.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-0 pt-0 sm:px-6 sm:pl-14">
        <ol className="list-decimal space-y-2.5 pl-4 text-xs leading-relaxed text-muted-foreground marker:font-medium marker:text-foreground sm:text-sm">
          <li>
            <strong className="text-foreground">Materiais</strong> — cadastre
            cada produto com <strong className="text-foreground">unidade</strong>{" "}
            (como conta: un, caixa…) e{" "}
            <strong className="text-foreground">saldo</strong> (quanto tem
            agora).
          </li>
          <li>
            <strong className="text-foreground">Movimentação</strong> — use para
            compra, saída manual, perda ou ajuste. Não substitui a regra de
            consumo por serviço.
          </li>
          <li>
            <strong className="text-foreground">Consumo automático</strong> — para
            cada serviço, defina quanto de cada material sai quando a consulta for
            marcada como <strong className="text-foreground">Concluída</strong>{" "}
            em Agendamentos. Sem regra cadastrada, concluir consulta não mexe no
            estoque.
          </li>
          <li>
            Se na conclusão faltar saldo para alguma regra, o sistema{" "}
            <strong className="text-foreground">impede concluir</strong> até
            entrar material ou ajustar a quantidade da regra.
          </li>
        </ol>
      </CardContent>
    </Card>
  )
}

function KpiCard({
  label,
  value,
  hint,
  variant = "default",
}: {
  label: string
  value: string
  hint: string
  variant?: "default" | "warning"
}) {
  return (
    <Card
      className={cn(
        "py-4 shadow-none",
        variant === "warning" && "border-amber-200 bg-amber-50/40",
      )}
    >
      <CardHeader className="gap-1 px-4 pb-0 pt-0 sm:px-5">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">
          {label}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-0 pt-1 sm:px-5">
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
