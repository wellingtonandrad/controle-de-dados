import { auth } from "@/lib/auth"
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id"
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

  const clinicOwnerId = getClinicOwnerUserId(session)
  if (!clinicOwnerId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  if (!canAccessReports(session)) {
    return NextResponse.json(
      { error: "Relatórios restritos a dentistas e ao dono da clínica." },
      { status: 403 },
    )
  }

  const { searchParams } = new URL(request.url)
  const raw = searchParams.get("period")
  const period: ReportPeriod =
    raw === "30d" || raw === "month" ? raw : "month"

  const data = await getReportsDashboardData({
    userId: clinicOwnerId,
    period,
  })

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    },
  })
}
