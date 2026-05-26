"use client"

import { ErpPageHeader } from "@/app/(panel)/dashboard/_components/erp-page-header"
import { Badge } from "@/components/ui/badge"
import { erpTableHead, erpTableWrap } from "@/lib/erp-shell"
import type { ErpVerticalModule } from "@/lib/generated/prisma"
import { ERP_MODULE_LABELS } from "@/lib/erp/vertical-modules"
import { ScrollText } from "lucide-react"

const CATEGORY_LABEL: Record<string, string> = {
  STOCK: "Estoque",
  SALE: "Vendas",
  FINANCE: "Financeiro",
  LOGISTICS: "Logística",
  ORGANIZATION: "Empresa",
}

type LogRow = {
  id: string
  category: string
  action: string
  summary: string
  entityType: string | null
  entityId: string | null
  createdAt: string
  userName: string | null
  userEmail: string | null
}

export function AuditoriaContent({
  logs,
  enabledModules,
}: {
  logs: LogRow[]
  enabledModules: ErpVerticalModule[]
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10">
      <ErpPageHeader
        title="Auditoria"
        description="Registro de alterações sensíveis: estoque, vendas, financeiro, logística e configuração da empresa."
        actions={
          <div className="flex flex-wrap gap-1.5">
            {enabledModules.map((m) => (
              <Badge key={m} variant="secondary" className="font-normal">
                {ERP_MODULE_LABELS[m]}
              </Badge>
            ))}
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <ScrollText className="size-5 text-slate-600" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {logs.length === 0
              ? "Nenhum evento registrado ainda. Ações em estoque, vendas e módulos passam a aparecer aqui."
              : `Últimos ${logs.length} evento(s).`}
          </p>
        </div>
        <div className={erpTableWrap}>
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className={erpTableHead}>
                <th className="px-4 py-3 text-left sm:px-6">Quando</th>
                <th className="px-2 py-3 text-left">Categoria</th>
                <th className="px-2 py-3 text-left">Resumo</th>
                <th className="px-4 py-3 text-left sm:px-6">Usuário</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                    Sem registros.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground sm:px-6">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-2 py-2.5">
                      <Badge variant="outline" className="font-normal">
                        {CATEGORY_LABEL[log.category] ?? log.category}
                      </Badge>
                    </td>
                    <td className="px-2 py-2.5 text-slate-900">{log.summary}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground sm:px-6">
                      {log.userName?.trim() || log.userEmail || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
