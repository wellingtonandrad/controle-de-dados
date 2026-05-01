"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import {
  getActiveOrganizationId,
  getBillingUserId,
} from "@/app/utils/auth/organization-context"
import { revalidatePath } from "next/cache"

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.enum(["MANAGER", "STAFF"]),
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

  if (session.user.organizationRole !== "OWNER") {
    return { error: "Apenas o dono da empresa pode adicionar pessoas à equipe." }
  }

  const organizationId = getActiveOrganizationId(session)
  const billingUserId = getBillingUserId(session)
  if (!organizationId || billingUserId !== session.user.id) {
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

  if (staff.id === billingUserId) {
    return { error: "Você já é o titular desta empresa." }
  }

  if (staff.role === "ACCOUNT_HOLDER") {
    return { error: "Contas titulares de outra empresa não podem ser adicionadas como equipe." }
  }

  try {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId,
          userId: staff.id,
        },
      },
      create: {
        organizationId,
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
