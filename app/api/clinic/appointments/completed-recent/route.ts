import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import type { Session } from "next-auth"
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id"

const LOOKBACK_DAYS = 45
const TAKE = 40

export const GET = auth(async function GET(request) {
  if (!request.auth) {
    return NextResponse.json({ error: "Acesso não autorizado" }, { status: 401 })
  }

  const clinicId = getClinicOwnerUserId(request.auth as Session | null)
  if (!clinicId) {
    return NextResponse.json({ error: "Usuário não encontrado" })
  }

  try {
    const since = new Date()
    since.setUTCDate(since.getUTCDate() - LOOKBACK_DAYS)
    since.setUTCHours(0, 0, 0, 0)

    const appointments = await prisma.appointment.findMany({
      where: {
        userId: clinicId,
        status: "COMPLETED",
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
      { error: "Falha ao buscar concluídos recentes" },
      { status: 400 },
    )
  }
})
