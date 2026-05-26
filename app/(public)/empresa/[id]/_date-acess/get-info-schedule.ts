"use server"

import prisma from "@/lib/prisma"

export type PublicScheduleOrganization = {
  id: string
  name: string | null
  phone: string | null
  address: string | null
  image: string | null
  times: string[]
  status: boolean
  services: {
    id: string
    name: string
    price: number
    duration: number
    status: boolean
  }[]
}

export async function getInfoSchedule({
  organizationId,
}: {
  organizationId: string
}): Promise<PublicScheduleOrganization | null> {
  try {
    if (!organizationId) {
      return null
    }

    const org = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        verified: true,
        active: true,
      },
      include: {
        owner: {
          select: {
            name: true,
            phone: true,
            address: true,
            image: true,
            status: true,
            times: true,
          },
        },
        services: {
          where: { status: true },
        },
      },
    })

    if (!org?.owner) {
      return null
    }

    return {
      id: org.id,
      name: org.name,
      phone: org.phone ?? org.owner.phone,
      address: org.owner.address,
      image: org.owner.image,
      times: org.owner.times,
      status: org.owner.status,
      services: org.services,
    }
  } catch (err) {
    console.error(err)
    return null
  }
}
