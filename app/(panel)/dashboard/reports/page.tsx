import { connection } from "next/server"
import { redirect } from "next/navigation"
import { getReportsDashboardData } from "./_data_access/get-permission-report"
import getSession from "@/lib/getSession"
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id"
import { canAccessReports } from "@/app/utils/auth/can-access-reports"
import { ReportsDrePanel } from "./_components/reports-dre-panel"
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

  const clinicOwnerId = getClinicOwnerUserId(session)
  if (!clinicOwnerId) {
    redirect("/acesso-clinica")
  }

  if (!canAccessReports(session)) {
    redirect("/dashboard")
  }

  const dashboard = await getReportsDashboardData({
    userId: clinicOwnerId,
    period,
  })

  return (
    <main className="space-y-6">
      <header className="mb-2 space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900">Relatórios</h1>
        <p className="text-sm text-zinc-500">
          A <strong>receita reconhecida</strong> usa consultas{" "}
          <strong>Concluídas</strong> na data em que você marcou concluído. O{" "}
          <strong>caixa</strong> e o <strong>a receber</strong> vêm das parcelas no
          detalhe da consulta (pagamento único ou parcelado). O aviso amarelo some
          quando não há mais agendamentos pendentes.
        </p>
      </header>

      <ReportsDrePanel initialData={dashboard} period={period} />
    </main>
  )
}
