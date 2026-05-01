// Horários já ocupados na agenda pública (por organização).

import prisma from "@/lib/prisma"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const organizationId =
    searchParams.get("organizationId") ?? searchParams.get("userId")

  const dateParam = searchParams.get("date")

  if (
    !organizationId ||
    organizationId === "null" ||
    !dateParam ||
    dateParam === "null"
  ) {
    return NextResponse.json(
      { error: "Nenhum agendamento encontrado" },
      { status: 400 },
    )
  }

  try {
    const [year, month, day] = dateParam.split("-").map(Number)
    const startDate = new Date(year, month - 1, day, 0, 0, 0)
    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999)

    const org = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        verified: true,
        active: true,
      },
      include: {
        owner: {
          select: {
            times: true,
            status: true,
          },
        },
      },
    })

    if (!org?.owner?.status) {
      return NextResponse.json(
        { error: "Nenhum agendamento encontrado" },
        { status: 400 },
      )
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        organizationId: org.id,
        appointmentDate: {
          gte: startDate,
          lte: endDate,
        },
        status: "SCHEDULED",
      },
      include: {
        service: true,
      },
    })

    const blockedSlots = new Set<string>()
    const times = org.owner.times

    for (const apt of appointments) {
      const requiredSlots = Math.ceil(apt.service.duration / 30)
      const startIndex = times.indexOf(apt.time)

      if (startIndex !== -1) {
        for (let i = 0; i < requiredSlots; i++) {
          const blockedSlot = times[startIndex + i]
          if (blockedSlot) {
            blockedSlots.add(blockedSlot)
          }
        }
      }
    }

    const blockedtimes = Array.from(blockedSlots)

    return NextResponse.json(blockedtimes)
  } catch (err) {
    console.log(err)
    return NextResponse.json(
      { error: "Nenhum agendamento encontrado" },
      { status: 400 },
    )
  }
}
