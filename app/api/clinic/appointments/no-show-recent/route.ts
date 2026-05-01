import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"

const LOOKBACK_DAYS = 45
const TAKE = 40

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Acesso n�o autorizado" }, { status: 401 })
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    return NextResponse.json({ error: "Usu�rio n�o encontrado" }, { status: 403 })
  }

  try {
    const since = new Date()
    since.setUTCDate(since.getUTCDate() - LOOKBACK_DAYS)
    since.setUTCHours(0, 0, 0, 0)

    const appointments = await prisma.appointment.findMany({
      where: {
        organizationId,
        status: "NO_SHOW",
        updatedAt: { gte: since },
      },
      include: {
        service: true,
      },
      orderBy: { updatedAt: "desc" },
      take: TAKE,
    })

    return NextResponse.json(appointments)
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Falha ao buscar faltas recentes" },
      { status: 400 },
    )
  }
}
