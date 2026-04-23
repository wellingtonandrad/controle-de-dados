import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import type { Session } from "next-auth"
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id"

export const GET = auth(async function GET(
  request: Request & { auth?: Session | null },
  context: { params: Promise<{ appointmentId: string }> },
) {
  if (!request.auth) {
    return NextResponse.json({ error: "Acesso não autorizado" }, { status: 401 })
  }

  const clinicId = getClinicOwnerUserId(request.auth as Session | null)
  if (!clinicId) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 403 })
  }

  const { appointmentId } = await context.params

  try {
    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, userId: clinicId },
      select: { id: true },
    })
    if (!appt) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
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
})
