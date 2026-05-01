import type { Session } from "next-auth"
import prisma from "@/lib/prisma"
import { ensureDefaultOrganizationForAccountHolder } from "@/lib/organization/ensure-default-organization"

const DEMO_EMAIL =
  process.env.DEMO_PANEL_USER_EMAIL ?? "__panel_demo@local.invalid"

/**
 * Sessão sintética para desenvolvimento quando `PANEL_NO_AUTH=true`.
 * Nunca ative em produção com dados reais.
 */
export async function getDemoPanelSession(): Promise<Session | null> {
  if (process.env.PANEL_NO_AUTH !== "true") {
    return null
  }

  let user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true, email: true, name: true, role: true },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: "Painel (sem login)",
        role: "ACCOUNT_HOLDER",
      },
      select: { id: true, email: true, name: true, role: true },
    })
  } else if (user.role !== "ACCOUNT_HOLDER") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "ACCOUNT_HOLDER" },
    })
    user = { ...user, role: "ACCOUNT_HOLDER" }
  }

  let organizationId = await ensureDefaultOrganizationForAccountHolder(
    user.id,
  )
  if (!organizationId) {
    const row = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    })
    organizationId = row?.organizationId ?? null
  }
  if (!organizationId) {
    return null
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, verified: true, active: true, ownerUserId: true },
  })
  if (!organization?.active) {
    return null
  }

  if (!organization.verified) {
    await prisma.organization.update({
      where: { id: organization.id },
      data: { verified: true, active: true },
    })
  }

  const expires = new Date(Date.now() + 86400_000 * 30).toISOString()

  return {
    expires,
    user: {
      id: user.id,
      email: user.email ?? DEMO_EMAIL,
      name: user.name,
      image: null,
      role: "ACCOUNT_HOLDER",
      activeOrganizationId: organization.id,
      organizationRole: "OWNER",
      organizationVerified: true,
      billingUserId: organization.ownerUserId,
    },
  } as Session
}
