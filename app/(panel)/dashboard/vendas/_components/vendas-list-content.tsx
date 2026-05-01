"use client"

import type { Prisma } from "@/lib/generated/prisma"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ErpPageHeader } from "@/app/(panel)/dashboard/_components/erp-page-header"
import { erpTableWrap, erpTableHead, erpEmptyState } from "@/lib/erp-shell"
import { formatCentsToBrl } from "@/app/utils/convertCurrency"
import { cancelSale, confirmSale } from "../_actions/sale-actions"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export type SaleWithRelations = Prisma.SaleGetPayload<{
  include: {
    customer: true
    lines: { include: { product: true } }
  }
}>

export function VendasListContent({ sales }: { sales: SaleWithRelations[] }) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "CONFIRMED" | "CANCELLED">("ALL")

  async function handleCancel(id: string) {
    if (!confirm("Cancelar esta venda?")) return
    const res = await cancelSale(id)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success("Venda cancelada")
    router.refresh()
  }

  async function handleConfirm(id: string) {
    const res = await confirmSale(id)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success("Orçamento confirmado")
    router.refresh()
  }

  const filteredSales = useMemo(() => {
    if (statusFilter === "ALL") return sales
    return sales.filter((s) => s.status === statusFilter)
  }, [sales, statusFilter])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ErpPageHeader
        title="Vendas"
        description="Pedidos registrados com itens, totais e status. Use filtros na lista conforme for evoluindo o módulo."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/vendas/dashboard">Dashboard</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/vendas/nova">+ Nova venda</Link>
            </Button>
          </div>
        }
      />

      {sales.length === 0 ? (
        <p className={erpEmptyState}>
          Nenhuma venda ainda.{" "}
          <Link href="/dashboard/vendas/nova" className="font-medium text-emerald-700 underline">
            Registrar primeira venda
          </Link>
        </p>
      ) : (
        <>
        <div className="flex flex-wrap gap-2">
          <Button variant={statusFilter === "ALL" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("ALL")}>
            Todos ({sales.length})
          </Button>
          <Button variant={statusFilter === "DRAFT" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("DRAFT")}>
            Orçamentos ({sales.filter((s) => s.status === "DRAFT").length})
          </Button>
          <Button variant={statusFilter === "CONFIRMED" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("CONFIRMED")}>
            Confirmadas ({sales.filter((s) => s.status === "CONFIRMED").length})
          </Button>
          <Button variant={statusFilter === "CANCELLED" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("CANCELLED")}>
            Canceladas ({sales.filter((s) => s.status === "CANCELLED").length})
          </Button>
        </div>
        <div className={erpTableWrap}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className={erpTableHead}>
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Itens</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredSales.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-zinc-700">
                    {format(s.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    {s.customer?.name ?? (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {s.lines.length} item(s)
                    <span className="mt-1 block text-xs text-zinc-500">
                      {s.lines
                        .map((l) => `${l.quantity}× ${l.product.name}`)
                        .join(", ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {formatCentsToBrl(s.totalCents)}
                  </td>
                  <td className="px-4 py-3">
                    {s.status === "CONFIRMED" ? (
                      <Badge variant="success">Concluída</Badge>
                    ) : s.status === "CANCELLED" ? (
                      <Badge variant="destructive">Cancelada</Badge>
                    ) : (
                      <Badge variant="pending">Rascunho</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status === "CONFIRMED" ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => handleCancel(s.id)}>
                        Cancelar
                      </Button>
                    ) : s.status === "DRAFT" ? (
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" onClick={() => handleConfirm(s.id)}>
                          Confirmar
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleCancel(s.id)}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
