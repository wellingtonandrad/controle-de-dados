import { auth } from "@/lib/auth"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { canAccessReports } from "@/app/utils/auth/can-access-reports"
import { getReportsDashboardData } from "@/app/(panel)/dashboard/reports/_data_access/get-permission-report"
import type { ReportPeriod } from "@/app/(panel)/dashboard/reports/_types/dashboard"
import { connection } from "next/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  await connection()
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  if (!canAccessReports(session)) {
    return NextResponse.json(
      { error: "Sem permissão para ver relatórios financeiros." },
      { status: 403 },
    )
  }

  const { searchParams } = new URL(request.url)
  const raw = searchParams.get("period")
  const period: ReportPeriod =
    raw === "30d" || raw === "month" ? raw : "month"

  const data = await getReportsDashboardData({
    organizationId,
    period,
  })

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    },
  })
}
