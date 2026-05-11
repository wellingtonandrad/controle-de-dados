import { connection } from "next/server"
import { redirect } from "next/navigation"
import { getReportsDashboardData } from "./_data_access/get-permission-report"
import getSession from "@/lib/getSession"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { canAccessReports } from "@/app/utils/auth/can-access-reports"
import { ReportsDrePanel } from "./_components/reports-dre-panel"
import { ErpPageHeader } from "../_components/erp-page-header"
import type { ReportPeriod } from "./_types/dashboard"

export const dynamic = "force-dynamic"

function normalizePeriod(period?: string): ReportPeriod {
  if (period === "30d" || period === "month") {
    return period
  }
  /* Links antigos (?period=7d) passam a refletir o mês corrente. */
  if (period === "7d") {
    return "month"
  }
  return "month"
}

export default async function Reports({
  searchParams,
}: {
  searchParams?: { period?: string } | Promise<{ period?: string }>
}) {
  await connection()

  const resolvedSearchParams = await Promise.resolve(searchParams)
  const period = normalizePeriod(resolvedSearchParams?.period)

  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    redirect("/acesso-empresa")
  }

  if (!(await canAccessReports(session))) {
    redirect("/dashboard/overview")
  }

  const dashboard = await getReportsDashboardData({
    organizationId,
    period,
  })

  return (
    <div className="mx-auto max-w-7xl">
      <div className="dark rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-5 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.04] sm:p-8">
        <div className="space-y-8">
          <ErpPageHeader
            variant="dark"
            title="Relatórios"
            description="Resultado a partir das vendas e compras que você confirma no sistema. Escolha o período abaixo."
          />

          <ReportsDrePanel initialData={dashboard} period={period} />
        </div>
      </div>
    </div>
  )
}
