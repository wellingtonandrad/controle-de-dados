"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { recordAudit } from "@/lib/audit/record-audit"
import type { ErpVerticalModule } from "@/lib/generated/prisma"

const moduleSchema = z.enum(["LOGISTICS", "MARKETS", "SERVICES", "HOSPITALS", "INDUSTRY"])

const updateSchema = z.object({
  modules: z.array(moduleSchema).min(1, "Mantenha ao menos um módulo ativo."),
})

export async function updateOrganizationModules(modules: ErpVerticalModule[]) {
  const parsed = updateSchema.safeParse({ modules })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" }

  const session = await auth()
  if (!session?.user?.id) return { error: "Sessão inválida." }
  if (session.user.organizationRole !== "OWNER") {
    return { error: "Apenas o titular da empresa pode alterar os módulos." }
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) return { error: "Empresa não identificada." }

  try {
    const before = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { enabledModules: true, name: true },
    })

    await prisma.organization.update({
      where: { id: organizationId },
      data: { enabledModules: parsed.data.modules },
    })

    await recordAudit({
      organizationId,
      userId: session.user.id,
      category: "ORGANIZATION",
      action: "organization.modules.update",
      summary: `Módulos atualizados: ${parsed.data.modules.join(", ")}`,
      entityType: "Organization",
      entityId: organizationId,
      metadata: {
        before: before?.enabledModules ?? [],
        after: parsed.data.modules,
      },
    })

    revalidatePath("/dashboard/profile")
    revalidatePath("/dashboard/auditoria")
    revalidatePath("/dashboard")
    return { data: "Módulos da empresa atualizados." as const }
  } catch {
    return { error: "Não foi possível salvar os módulos." }
  }
}
