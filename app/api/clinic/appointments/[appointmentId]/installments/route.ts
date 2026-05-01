import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"

export async function GET(
  _request: Request,
  context: { params: Promise<{ appointmentId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Acesso n�o autorizado" }, { status: 401 })
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    return NextResponse.json({ error: "Usu�rio n�o encontrado" }, { status: 403 })
  }

  const { appointmentId } = await context.params

  try {
    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId },
      select: { id: true },
    })
    if (!appt) {
      return NextResponse.json(
        { error: "Agendamento n�o encontrado" },
        { status: 404 },
      )
    }

    const rows = await prisma.appointmentInstallment.findMany({
      where: { appointmentId },
      orderBy: { sequence: "asc" },
    })

    return NextResponse.json(rows)
  } catch {
    return NextResponse.json(
      { error: "Falha ao carregar parcelas" },
      { status: 400 },
    )
  }
}
