"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ErpPageHeader } from "@/app/(panel)/dashboard/_components/erp-page-header"
import { erpTableWrap, erpTableHead } from "@/lib/erp-shell"
import { cancelPurchase, createPurchase, createSupplier } from "../_actions/purchase-actions"
import { formatCentsToBrl, parseMoneyToCents } from "@/app/utils/convertCurrency"

type SupplierOption = {
  id: string
  name: string
  history?: {
    purchasesCount: number
    totalCents: number
    lastPurchaseAt: Date | null
  }
}

type ProductOption = {
  id: string
  name: string
  unit: string
}

type PurchaseRow = {
  id: string
  createdAt: Date
  totalCents: number
  status: string
  supplierName: string | null
  productSummary: string
}

export function ComprasContent({
  suppliers,
  products,
  purchases,
  monthPurchasesCount,
  monthPurchasesTotalCents,
}: {
  suppliers: SupplierOption[]
  products: ProductOption[]
  purchases: PurchaseRow[]
  monthPurchasesCount: number
  monthPurchasesTotalCents: number
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const [supplierName, setSupplierName] = useState("")
  const [supplierEmail, setSupplierEmail] = useState("")
  const [supplierPhone, setSupplierPhone] = useState("")

  const [supplierId, setSupplierId] = useState("")
  const [supplierFilterId, setSupplierFilterId] = useState("")
  const [periodFilter, setPeriodFilter] = useState<"all" | "month" | "30d">("all")
  const [lineProductId, setLineProductId] = useState("")
  const [lineQuantity, setLineQuantity] = useState("1")
  const [lineUnitCost, setLineUnitCost] = useState("")
  const [lines, setLines] = useState<
    { productId: string; productName: string; quantity: number; unitCostCents: number; lineTotalCents: number }[]
  >([])
  const [notes, setNotes] = useState("")

  const monthTicketCents =
    monthPurchasesCount > 0 ? Math.round(monthPurchasesTotalCents / monthPurchasesCount) : 0

  const filteredPurchases = useMemo(() => {
    const now = new Date()
    let startDate: Date | null = null
    if (periodFilter === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (periodFilter === "30d") {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 30)
    }

    const supplierName =
      supplierFilterId
        ? suppliers.find((s) => s.id === supplierFilterId)?.name ?? null
        : null

    return purchases.filter((purchase) => {
      if (startDate && purchase.createdAt < startDate) return false
      if (supplierName && purchase.supplierName !== supplierName) return false
      return true
    })
  }, [periodFilter, purchases, supplierFilterId, suppliers])

  async function handleCreateSupplier(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await createSupplier({
      name: supplierName,
      email: supplierEmail || undefined,
      phone: supplierPhone || undefined,
    })
    setPending(false)
    if (res.error) return toast.error(res.error)
    toast.success("Fornecedor cadastrado")
    setSupplierName("")
    setSupplierEmail("")
    setSupplierPhone("")
    router.refresh()
  }

  async function handleCreatePurchase(e: React.FormEvent) {
    e.preventDefault()
    if (lines.length === 0) return toast.error("Adicione pelo menos 1 item")

    setPending(true)
    const res = await createPurchase({
      supplierId: supplierId || undefined,
      lines: lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitCostCents: line.unitCostCents,
      })),
      notes: notes || undefined,
    })
    setPending(false)
    if (res.error) return toast.error(res.error)
    toast.success("Compra registrada")
    setSupplierId("")
    setLineProductId("")
    setLineQuantity("1")
    setLineUnitCost("")
    setLines([])
    setNotes("")
    router.refresh()
  }

  function addLine() {
    if (!lineProductId) return toast.error("Selecione um produto")
    let unitCostCents = 0
    try {
      unitCostCents = parseMoneyToCents(lineUnitCost)
    } catch {
      return toast.error("Custo unitário inválido")
    }
    const quantity = Number(lineQuantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return toast.error("Quantidade inválida")
    }
    const productName = products.find((p) => p.id === lineProductId)?.name ?? "Produto"
    const lineTotalCents = quantity * unitCostCents
    setLines((prev) => [
      ...prev,
      { productId: lineProductId, productName, quantity, unitCostCents, lineTotalCents },
    ])
    setLineProductId("")
    setLineQuantity("1")
    setLineUnitCost("")
  }

  async function handleCancelPurchase(id: string) {
    if (!confirm("Cancelar esta compra?")) return
    const res = await cancelPurchase(id)
    if (res.error) return toast.error(res.error)
    toast.success("Compra cancelada")
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ErpPageHeader
        title="Compras"
        description="Cadastre fornecedores e registre compras com várias linhas. Compras confirmadas atualizam o estoque."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500">Compras no mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900">{monthPurchasesCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500">Valor de compras</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900">
              {formatCentsToBrl(monthPurchasesTotalCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-500">Ticket médio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-zinc-900">
              {formatCentsToBrl(monthTicketCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Novo fornecedor</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSupplier} className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sup-name">Nome *</Label>
                <Input
                  id="sup-name"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Fornecedor LTDA"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sup-email">E-mail</Label>
                <Input
                  id="sup-email"
                  type="email"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sup-phone">Telefone</Label>
                <Input
                  id="sup-phone"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={pending || !supplierName.trim()}>
                Salvar fornecedor
              </Button>
            </form>
            {suppliers.length > 0 ? (
              <div className="mt-4 rounded-md border border-zinc-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Histórico por fornecedor
                </p>
                <ul className="space-y-2 text-sm">
                  {suppliers.slice(0, 5).map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3">
                      <span className="font-medium text-zinc-800">{s.name}</span>
                      <span className="text-xs text-zinc-600">
                        {(s.history?.purchasesCount ?? 0).toLocaleString("pt-BR")} compra(s) ·{" "}
                        {formatCentsToBrl(s.history?.totalCents ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nova compra</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePurchase} className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-supplier">Fornecedor</Label>
                <select
                  id="p-supplier"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">Sem fornecedor</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-product">Produto</Label>
                <select
                  id="p-product"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={lineProductId}
                  onChange={(e) => setLineProductId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p-qty">Quantidade *</Label>
                  <Input
                    id="p-qty"
                    type="number"
                    min={1}
                    value={lineQuantity}
                    onChange={(e) => setLineQuantity(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-cost">Custo unitário (R$) *</Label>
                  <Input
                    id="p-cost"
                    value={lineUnitCost}
                    onChange={(e) => setLineUnitCost(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={addLine}>
                  Adicionar item
                </Button>
                <span className="text-sm text-zinc-600 self-center">
                  {lines.length} item(ns)
                </span>
              </div>
              {lines.length > 0 ? (
                <div className="rounded-md border border-zinc-200 p-2 text-sm">
                  <ul className="space-y-1">
                    {lines.map((line, idx) => (
                      <li key={`${line.productId}-${idx}`} className="flex justify-between gap-2">
                        <span>
                          {line.quantity}x {line.productName}
                        </span>
                        <span className="font-medium">{formatCentsToBrl(line.lineTotalCents)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 border-t pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCentsToBrl(lines.reduce((s, l) => s + l.lineTotalCents, 0))}</span>
                  </div>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="p-notes">Observações</Label>
                <Input id="p-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button type="submit" disabled={pending || lines.length === 0}>
                Registrar compra
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compras recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs text-zinc-500">
              Mostrando {filteredPurchases.length} de {purchases.length} compra(s)
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPeriodFilter("all")
                setSupplierFilterId("")
              }}
              disabled={periodFilter === "all" && supplierFilterId === ""}
            >
              Limpar filtros
            </Button>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="f-period">Período</Label>
              <select
                id="f-period"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as "all" | "month" | "30d")}
              >
                <option value="all">Todo período</option>
                <option value="month">Mês atual</option>
                <option value="30d">Últimos 30 dias</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-supplier">Fornecedor</Label>
              <select
                id="f-supplier"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={supplierFilterId}
                onChange={(e) => setSupplierFilterId(e.target.value)}
              >
                <option value="">Todos</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredPurchases.length === 0 ? (
            <p className="text-sm text-zinc-600">Nenhuma compra registrada.</p>
          ) : (
            <div className={erpTableWrap}>
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className={erpTableHead}>
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Fornecedor</th>
                    <th className="px-4 py-3">Itens</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredPurchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="px-4 py-3 text-zinc-700">
                        {format(purchase.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="px-4 py-3">{purchase.supplierName ?? "—"}</td>
                      <td className="px-4 py-3 text-zinc-600">{purchase.productSummary}</td>
                      <td className="px-4 py-3 font-semibold text-zinc-900">
                        {formatCentsToBrl(purchase.totalCents)}
                      </td>
                      <td className="px-4 py-3">
                        {purchase.status === "Confirmada" ? (
                          <Badge variant="success">Confirmada</Badge>
                        ) : purchase.status === "Cancelada" ? (
                          <Badge variant="destructive">Cancelada</Badge>
                        ) : (
                          <Badge variant="pending">Rascunho</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {purchase.status === "Confirmada" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelPurchase(purchase.id)}
                          >
                            Cancelar
                          </Button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

