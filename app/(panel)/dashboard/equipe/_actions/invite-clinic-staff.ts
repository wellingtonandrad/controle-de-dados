"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id"
import { revalidatePath } from "next/cache"

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.enum(["RECEPTION", "DENTIST"]),
})

export async function inviteClinicStaff(form: z.infer<typeof schema>) {
  const parsed = schema.safeParse(form)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Sessão inválida" }
  }

  if (session.user.clinicStaffRole !== "OWNER") {
    return { error: "Apenas o dono da clínica pode adicionar pessoas à equipe." }
  }

  const clinicOwnerId = getClinicOwnerUserId(session)
  if (!clinicOwnerId || clinicOwnerId !== session.user.id) {
    return { error: "Operação não permitida." }
  }

  const email = parsed.data.email.trim().toLowerCase()

  const staff = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  })

  if (!staff) {
    return {
      error:
        "Nenhuma conta encontrada com este e-mail. A pessoa precisa fazer login uma vez no site antes de ser adicionada.",
    }
  }

  if (staff.id === clinicOwnerId) {
    return { error: "Você já é o dono desta clínica." }
  }

  if (staff.role === "CLINIC") {
    return { error: "Contas de clínica não podem ser adicionadas como recepção." }
  }

  try {
    await prisma.clinicMember.upsert({
      where: {
        clinicOwnerId_userId: {
          clinicOwnerId,
          userId: staff.id,
        },
      },
      create: {
        clinicOwnerId,
        userId: staff.id,
        role: parsed.data.role,
      },
      update: {
        role: parsed.data.role,
      },
    })

    revalidatePath("/dashboard/equipe")
    return { data: "Pessoa adicionada à equipe com sucesso." }
  } catch {
    return { error: "Não foi possível salvar o membro da equipe." }
  }
}
