import { redirect } from "next/navigation"
import getSession from "@/lib/getSession"
import prisma from "@/lib/prisma"
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id"

export async function requireClinicUser() {
  const session = await getSession()

  if (!session?.user?.id) {
    redirect("/acesso-clinica")
  }

  const clinicOwnerId = getClinicOwnerUserId(session)

  if (!clinicOwnerId) {
    redirect("/acesso-clinica")
  }

  const owner = await prisma.user.findUnique({
    where: { id: clinicOwnerId },
    select: {
      id: true,
      email: true,
      role: true,
      clinicVerified: true,
      status: true,
    },
  })

  if (!owner?.status || owner.role !== "CLINIC" || !owner.clinicVerified) {
    redirect("/acesso-clinica")
  }

  if (session.user.role === "CLINIC" && session.user.id === owner.id) {
    return owner
  }

  const membership = await prisma.clinicMember.findUnique({
    where: {
      clinicOwnerId_userId: {
        clinicOwnerId: owner.id,
        userId: session.user.id,
      },
    },
  })

  if (!membership) {
    redirect("/acesso-clinica")
  }

  return owner
}
