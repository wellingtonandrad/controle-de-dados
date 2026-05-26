import { redirect } from "next/navigation"
import getSession from "@/lib/getSession"
import prisma from "@/lib/prisma"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { ensureDefaultOrganizationForAccountHolder } from "@/lib/organization/ensure-default-organization"

/** Acesso ao painel: usuário titular ou membro de organização verificada e ativa. */
export async function requireOrganizationUser() {
  const session = await getSession()

  if (!session?.user?.id) {
    redirect("/acesso-empresa")
  }

  if (session.user.role !== "ACCOUNT_HOLDER") {
    redirect("/acesso-empresa")
  }

  let organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    organizationId = await ensureDefaultOrganizationForAccountHolder(session.user.id)
  }

  if (!organizationId) {
    redirect("/acesso-empresa")
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      verified: true,
      active: true,
      ownerUserId: true,
      enabledModules: true,
    },
  })

  if (!organization?.active || !organization.verified) {
    redirect("/acesso-empresa")
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: session.user.id,
      },
    },
  })

  if (!membership) {
    redirect("/acesso-empresa")
  }

  return { organization, membership }
}
