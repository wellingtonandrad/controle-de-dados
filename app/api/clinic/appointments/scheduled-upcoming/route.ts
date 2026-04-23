import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import type { Session } from "next-auth"
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id"

export const GET = auth(async function GET(request) {
  if (!request.auth) {
    return NextResponse.json({ error: "Acesso não autorizado" }, { status: 401 })
  }

  const clinicId = getClinicOwnerUserId(request.auth as Session | null)
  if (!clinicId) {
    return NextResponse.json({ error: "Usuário não encontrado" })
  }

  try {
    const now = new Date()
    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    )
    const end = new Date(start)
    end.setUTCMonth(end.getUTCMonth() + 6)

    const appointments = await prisma.appointment.findMany({
      where: {
        userId: clinicId,
        status: "SCHEDULED",
        appointmentDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        service: true,
      },
      orderBy: [{ appointmentDate: "asc" }, { time: "asc" }],
    })

    return NextResponse.json(appointments)
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Falha ao buscar agendamentos futuros" },
      { status: 400 },
    )
  }
})
