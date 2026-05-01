"use server"

import prisma from "@/lib/prisma"

export async function getTimesClinic({
  organizationId,
}: {
  organizationId: string
}) {
  if (!organizationId) {
    return {
      times: [] as string[],
      organizationId: "",
    }
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        owner: {
          select: { id: true, times: true },
        },
      },
    })

    if (!org?.owner) {
      return {
        times: [] as string[],
        organizationId: "",
      }
    }

    return {
      times: org.owner.times,
      organizationId: org.id,
    }
  } catch (err) {
    console.log(err)
    return {
      times: [] as string[],
      organizationId: "",
    }
  }
}
