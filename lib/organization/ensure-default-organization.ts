import prisma from "@/lib/prisma"

/**
 * Garante uma organização + vínculo OWNER para titulares sem registro (ex.: conta nova).
 * Retorna o id da organização ativa ou null.
 */
export async function ensureDefaultOrganizationForAccountHolder(
  userId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, name: true },
  })

  if (!user || user.role !== "ACCOUNT_HOLDER") {
    return null
  }

  const existingMember = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  })
  if (existingMember) {
    return existingMember.organizationId
  }

  const baseSlug = (user.email ?? user.id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)

  const slug = `${baseSlug || "empresa"}-${user.id.slice(-8)}`

  const org = await prisma.organization.create({
    data: {
      ownerUserId: user.id,
      name: user.name?.trim() || user.email || "Nova empresa",
      slug,
      verified: true,
      active: true,
    },
  })

  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: "OWNER",
    },
  })

  return org.id
}
