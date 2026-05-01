"use client"

import type { Product } from "@/lib/generated/prisma"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ErpPageHeader } from "@/app/(panel)/dashboard/_components/erp-page-header"
import { erpTableWrap, erpTableHead, erpEmptyState } from "@/lib/erp-shell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createProduct, setProductActive } from "../_actions/product-actions"
import { toast } from "sonner"
import { Search } from "lucide-react"
import { formatCentsToBrl, parseMoneyToCents } from "@/app/utils/convertCurrency"

function normalizeSearch(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function ProdutosContent({ products }: { products: Product[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [pending, setPending] = useState(false)

  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [unit, setUnit] = useState("un")
  const [price, setPrice] = useState("")
  const [cost, setCost] = useState("")

  const filtered = useMemo(() => {
    const q = normalizeSearch(query)
    if (!q) return products
    return products.filter((p) => {
      const hay = normalizeSearch(`${p.name} ${p.sku ?? ""}`)
      return hay.includes(q)
    })
  }, [products, query])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    let priceCents = 0
    try {
      priceCents = parseMoneyToCents(price)
    } catch {
      setPending(false)
      toast.error("Preço de venda inválido")
      return
    }

    let costCents: number | undefined
    if (cost.trim()) {
      try {
        costCents = parseMoneyToCents(cost)
      } catch {
        setPending(false)
        toast.error("Custo inválido")
        return
      }
    }

    const res = await createProduct({
      name,
      sku: sku || undefined,
      unit: unit || "un",
      priceCents,
      costCents,
    })
    setPending(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success("Produto cadastrado")
    router.refresh()
    setName("")
    setSku("")
    setUnit("un")
    setPrice("")
    setCost("")
  }

  async function toggleActive(p: Product) {
    const res = await setProductActive(p.id, !p.active)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(p.active ? "Produto inativado" : "Produto reativado")
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Produtos</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Cadastro de produtos para vendas (preços em reais no formulário).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Novo produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="p-name">Nome *</Label>
                <Input
                  id="p-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ex.: Notebook 15 polegadas"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-sku">SKU / código</Label>
                <Input
                  id="p-sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-unit">Unidade</Label>
                <Input
                  id="p-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="un, kg, cx…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-price">Preço de venda (R$) *</Label>
                <Input
                  id="p-price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-cost">Custo (R$)</Label>
                <Input
                  id="p-cost"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <Button type="submit" disabled={pending || !name.trim()}>
              Salvar produto
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <div className="relative mb-4 max-w-md">
          <Label htmlFor="prod-search" className="sr-only">
            Buscar
          </Label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            id="prod-search"
            type="search"
            placeholder="Buscar por nome ou SKU…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoComplete="off"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-12 text-center text-sm text-zinc-600">
            {products.length === 0
              ? "Nenhum produto cadastrado."
              : "Nenhum resultado para a busca."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-zinc-50 text-xs font-medium uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Un.</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3">Custo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className={p.active ? "" : "bg-zinc-50/80 text-zinc-500"}
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {p.name}
                    </td>
                    <td className="px-4 py-3">{p.sku ?? "—"}</td>
                    <td className="px-4 py-3">{p.unit}</td>
                    <td className="px-4 py-3">
                      {formatCentsToBrl(p.priceCents)}
                    </td>
                    <td className="px-4 py-3">
                      {p.costCents != null ? formatCentsToBrl(p.costCents) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.active ? (
                        <Badge variant="success">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(p)}
                      >
                        {p.active ? "Inativar" : "Reativar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
