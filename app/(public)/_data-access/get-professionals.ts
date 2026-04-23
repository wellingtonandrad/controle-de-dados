import prisma from "@/lib/prisma"

/** Clínicas que podem aparecer na vitrine pública de agendamento. */
export async function getProfessionals() {
  try {
    const professionals = await prisma.user.findMany({
      where: {
        status: true,
        role: "CLINIC",
        clinicVerified: true,
      },
      include: {
        subscription: true,
      },
      orderBy: {
        name: "asc",
      },
    })

    return professionals
  } catch {
    return []
  }
}
