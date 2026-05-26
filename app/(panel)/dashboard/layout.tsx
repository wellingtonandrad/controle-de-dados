import { SidebarDashboard } from "./_components/sidebar"
import { requireOrganizationUser } from "@/app/utils/auth/require-organization-user"
import getSession from "@/lib/getSession"
import { canAccessReports } from "@/app/utils/auth/can-access-reports"
import { hasOrganizationPermission } from "@/app/utils/auth/rbac"
import prisma from "@/lib/prisma"
import { normalizeEnabledModules } from "@/lib/erp/vertical-modules"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { organization } = await requireOrganizationUser()
  const session = await getSession()
  const isOrganizationOwner = session?.user?.organizationRole === "OWNER"
  const canViewReports = await canAccessReports(session)
  const enabledModules = normalizeEnabledModules(organization.enabledModules)

  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  const [openManualReceivables, openInstallments, canManageRbac] = await Promise.all([
    prisma.receivable.count({
      where: {
        organizationId: organization.id,
        paidAt: null,
        dueDate: { lte: endOfToday },
      },
    }),
    prisma.appointmentInstallment.count({
      where: {
        paidAt: null,
        dueDate: { lte: endOfToday },
        appointment: { organizationId: organization.id },
      },
    }),
    hasOrganizationPermission({
      session,
      organizationId: organization.id,
      permission: "rbac:manage",
    }),
  ])

  const notificationsCount = openManualReceivables + openInstallments

  return (
    <SidebarDashboard
      isOrganizationOwner={isOrganizationOwner}
      enabledModules={enabledModules}
      canViewReports={canViewReports}
      userName={session?.user?.name ?? null}
      userEmail={session?.user?.email ?? null}
      userImage={session?.user?.image ?? null}
      notificationsCount={notificationsCount}
      canManageRbac={canManageRbac}
    >
      {children}
    </SidebarDashboard>
  )
}
