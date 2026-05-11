import type { Session } from "next-auth"
import prisma from "@/lib/prisma"
import { getActiveOrganizationId } from "./organization-context"

export const PERMISSIONS = [
  { key: "reports:view", label: "Ver relatórios" },
  { key: "sales:view", label: "Ver vendas" },
  { key: "sales:manage", label: "Criar/editar vendas" },
  { key: "receivables:view", label: "Ver contas a receber" },
  { key: "receivables:manage", label: "Gerir contas a receber" },
  { key: "rbac:manage", label: "Gerir cargos e permissões" },
] as const

export type PermissionKey = (typeof PERMISSIONS)[number]["key"]

const ROLE_FALLBACK: Record<"OWNER" | "MANAGER" | "STAFF", PermissionKey[]> = {
  OWNER: PERMISSIONS.map((p) => p.key),
  MANAGER: ["reports:view", "sales:view", "sales:manage", "receivables:view"],
  STAFF: ["reports:view", "sales:view", "receivables:view", "receivables:manage"],
}

export const GROUP_TEMPLATES = [
  {
    name: "Admin",
    description: "Acesso total ao ERP",
    isSystem: true,
    permissions: PERMISSIONS.map((p) => p.key),
  },
  {
    name: "Financeiro",
    description: "Relatórios e contas a receber",
    isSystem: true,
    permissions: ["reports:view", "receivables:view", "receivables:manage"] as PermissionKey[],
  },
  {
    name: "Vendas",
    description: "Gestão comercial e orçamentos",
    isSystem: true,
    permissions: ["sales:view", "sales:manage", "receivables:view"] as PermissionKey[],
  },
  {
    name: "Operação",
    description: "Acesso operacional básico",
    isSystem: true,
    permissions: ["sales:view", "receivables:view"] as PermissionKey[],
  },
] as const

export async function ensureRbacDefaults(
  organizationId: string,
  ownerUserId?: string | null,
) {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { label: permission.label },
      create: { key: permission.key, label: permission.label },
    })
  }

  const perms = await prisma.permission.findMany({
    where: { key: { in: PERMISSIONS.map((p) => p.key) } },
    select: { id: true, key: true },
  })
  const idByKey = new Map(perms.map((p) => [p.key, p.id]))

  for (const template of GROUP_TEMPLATES) {
    const group = await prisma.accountGroup.upsert({
      where: { organizationId_name: { organizationId, name: template.name } },
      update: {
        description: template.description,
        isSystem: template.isSystem,
      },
      create: {
        organizationId,
        name: template.name,
        description: template.description,
        isSystem: template.isSystem,
      },
      select: { id: true, name: true },
    })

    const permissionIds = template.permissions
      .map((key) => idByKey.get(key))
      .filter((id): id is string => Boolean(id))

    await prisma.accountGroupPermission.deleteMany({ where: { groupId: group.id } })
    if (permissionIds.length > 0) {
      await prisma.accountGroupPermission.createMany({
        data: permissionIds.map((permissionId) => ({
          groupId: group.id,
          permissionId,
        })),
        skipDuplicates: true,
      })
    }

    if (template.name === "Admin" && ownerUserId) {
      const ownerMembership = await prisma.organizationMember.findFirst({
        where: { organizationId, userId: ownerUserId },
        select: { id: true },
      })
      if (ownerMembership) {
        await prisma.organizationMemberGroup.upsert({
          where: {
            organizationMemberId_accountGroupId: {
              organizationMemberId: ownerMembership.id,
              accountGroupId: group.id,
            },
          },
          update: {},
          create: {
            organizationMemberId: ownerMembership.id,
            accountGroupId: group.id,
            organizationId,
          },
        })
      }
    }
  }
}

export async function hasOrganizationPermission(params: {
  session: Session | null
  permission: PermissionKey
  organizationId?: string | null
}): Promise<boolean> {
  const { session, permission } = params
  const userId = session?.user?.id
  if (!userId) return false

  const organizationId =
    params.organizationId ?? getActiveOrganizationId(session)
  if (!organizationId) return false

  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId, userId },
    select: { id: true, role: true },
  })
  if (!membership) return false

  if (membership.role === "OWNER") return true

  const assignmentCount = await prisma.organizationMemberGroup.count({
    where: { organizationMemberId: membership.id },
  })

  if (assignmentCount > 0) {
    const hit = await prisma.organizationMemberGroup.findFirst({
      where: {
        organizationMemberId: membership.id,
        accountGroup: {
          permissions: {
            some: {
              permission: { key: permission },
            },
          },
        },
      },
      select: { id: true },
    })
    return Boolean(hit)
  }

  return ROLE_FALLBACK[membership.role]?.includes(permission) ?? false
}

