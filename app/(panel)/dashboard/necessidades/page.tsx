import Link from "next/link"
import { redirect } from "next/navigation"
import getSession from "@/lib/getSession"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { ErpPageHeader } from "@/app/(panel)/dashboard/_components/erp-page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { erpTableHead, erpTableWrap } from "@/lib/erp-shell"
import { getMrpShortages } from "./_data-access/get-mrp-shortages"

const ITEM_TYPE_LABEL: Record<string, string> = {
  MP: "Matéria-prima",
  PI: "Intermediário",
  PA: "Acabado",
  EM: "Embalagem",
  SV: "Serviço",
}

export default async function NecessidadesPage() {
  const session = await getSession()
  if (!session) redirect("/")

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) redirect("/acesso-empresa")

  const rows = await getMrpShortages(organizationId)
  const deficitCount = rows.filter((r) => r.shortage > 0).length

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ErpPageHeader
        title="Necessidades (MRP)"
        description="Demanda de materiais das ordens de produção abertas confrontada com o estoque atual."
      />

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
        <span className="font-medium text-slate-900">{rows.length}</span> insumo(s) na demanda agregada.
        {deficitCount > 0 ? (
          <>
            {" "}
            <span className="font-medium text-amber-800">{deficitCount}</span> com falta sugerida.
          </>
        ) : (
          <span className="text-emerald-700"> Nenhuma falta calculada para os itens com linha de estoque pelo nome do produto.</span>
        )}
      </div>

      <div className={erpTableWrap}>
        <table className="w-full text-sm">
          <thead className={erpTableHead}>
            <tr>
              <th className="px-3 py-2 text-left">Insumo</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-right">Necessário</th>
              <th className="px-3 py-2 text-right">Estoque</th>
              <th className="px-3 py-2 text-right">Falta</th>
              <th className="px-3 py-2 text-left">Sugestão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  Nenhuma OP aberta com BOM, ou nenhum componente listado.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.productId}>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-900">{r.name}</p>
                    <p className="text-xs text-slate-500">SKU {r.sku}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {ITEM_TYPE_LABEL[r.itemType] ?? r.itemType}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.requiredQty.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.onHand.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {r.shortage > 0 ? (
                      <span className="font-medium text-amber-800">{r.shortage.toLocaleString("pt-BR")}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {r.shortage <= 0 ? (
                      <Badge variant="secondary">OK</Badge>
                    ) : r.suggestProduce ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Produzir</Badge>
                        <Button variant="link" className="h-auto p-0 text-xs" asChild>
                          <Link href="/dashboard/engenharia">Engenharia</Link>
                        </Button>
                        <Button variant="link" className="h-auto p-0 text-xs" asChild>
                          <Link href="/dashboard/producao">OP</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="destructive">Comprar</Badge>
                        <Button variant="link" className="h-auto p-0 text-xs" asChild>
                          <Link href="/dashboard/compras">Compras</Link>
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        O estoque é casado pelo nome do produto com o item de estoque. Cadastre itens de estoque com o mesmo nome do produto para ver saldo correto.
      </p>
    </div>
  )
}
