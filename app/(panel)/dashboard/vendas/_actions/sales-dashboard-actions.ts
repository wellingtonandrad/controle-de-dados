"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { hasOrganizationPermission } from "@/app/utils/auth/rbac"

const saveGoalSchema = z.object({
  year: z.number().int().min(2000).max(3000),
  month: z.number().int().min(1).max(12),
  revenueCents: z.number().int().min(0),
  ordersCount: z.number().int().min(0),
})

export async function saveSalesGoal(raw: z.infer<typeof saveGoalSchema>) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Sessão inválida." }
  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) return { error: "Empresa não identificada." }
  const canManageSales = await hasOrganizationPermission({
    session,
    organizationId,
    permission: "sales:manage",
  })
  if (!canManageSales) return { error: "Sem permissão para gerir vendas." }

  const parsed = saveGoalSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  try {
    await prisma.salesGoal.upsert({
      where: {
        organizationId_year_month: {
          organizationId,
          year: parsed.data.year,
          month: parsed.data.month,
        },
      },
      create: {
        organizationId,
        year: parsed.data.year,
        month: parsed.data.month,
        revenueCents: parsed.data.revenueCents,
        ordersCount: parsed.data.ordersCount,
      },
      update: {
        revenueCents: parsed.data.revenueCents,
        ordersCount: parsed.data.ordersCount,
      },
    })
    revalidatePath("/dashboard/vendas/dashboard")
    return { ok: true as const }
  } catch {
    return { error: "Não foi possível salvar a meta." }
  }
}

