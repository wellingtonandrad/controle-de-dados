import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextResponse, type NextRequest } from "next/server"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Acesso n�o autorizado" }, { status: 401 })
  }

  const dateString = request.nextUrl.searchParams.get("date")
  const organizationId = getActiveOrganizationId(session)

  if (!dateString) {
    return NextResponse.json({ error: "Data n�o informada" }, { status: 400 })
  }

  if (!organizationId) {
    return NextResponse.json({ error: "Usu�rio n�o encontrado" }, { status: 403 })
  }

  try {
    const [year, month, day] = dateString.split("-").map(Number)
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))

    const appointments = await prisma.appointment.findMany({
      where: {
        organizationId,
        appointmentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        service: true,
      },
      orderBy: {
        time: "asc",
      },
    })

    return NextResponse.json(appointments)
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Falha ao buscar agendamentos" },
      { status: 400 },
    )
  }
}
