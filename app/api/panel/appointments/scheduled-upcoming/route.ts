import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"

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
        organizationId,
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
}
