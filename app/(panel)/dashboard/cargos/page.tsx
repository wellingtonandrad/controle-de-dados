import { redirect } from "next/navigation"
import getSession from "@/lib/getSession"
import prisma from "@/lib/prisma"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import {
  ensureRbacDefaults,
  hasOrganizationPermission,
} from "@/app/utils/auth/rbac"
import { getEmployees, getPermissions } from "./_actions/account-groups-actions"
import { AccountGroupsContent } from "./_components/account-groups-content"

export default async function CargosPage() {
  const session = await getSession()
  if (!session?.user?.id) redirect("/")

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) redirect("/acesso-empresa")

  await ensureRbacDefaults(organizationId, session.user.id)

  const canManageRbac = await hasOrganizationPermission({
    session,
    organizationId,
    permission: "rbac:manage",
  })
  if (!canManageRbac) redirect("/dashboard/overview")

  const [groups, permissionsResult, employeesResult] = await Promise.all([
    prisma.accountGroup.findMany({
      where: { organizationId },
      include: {
        permissions: { include: { permission: { select: { key: true } } } },
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
    getPermissions(),
    getEmployees({ page: 1, pageSize: 200 }),
  ])

  const permissions =
    "ok" in permissionsResult && permissionsResult.ok
      ? permissionsResult.data
      : []
  const members =
    "ok" in employeesResult && employeesResult.ok
      ? employeesResult.data.items
      : []

  return (
    <AccountGroupsContent
      permissions={permissions}
      groups={groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        isSystem: g.isSystem,
        permissionKeys: g.permissions.map((p) => p.permission.key),
      }))}
      members={members}
    />
  )
}

