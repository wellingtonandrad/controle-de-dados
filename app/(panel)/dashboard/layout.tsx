import { SidebarDashboard } from "./_components/sidebar"
import { requireClinicUser } from "@/app/utils/auth/require-clinic-user"
import getSession from "@/lib/getSession"
import { canAccessReports } from "@/app/utils/auth/can-access-reports"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import prisma from "@/lib/prisma"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}){
    await requireClinicUser()
    const session = await getSession()
    const isClinicOwner = session?.user?.organizationRole === "OWNER"
    const canViewReports = canAccessReports(session)
    const organizationId = session ? getActiveOrganizationId(session) : null
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)

    const [openManualReceivables, openInstallments] = organizationId
      ? await Promise.all([
          prisma.receivable.count({
            where: {
              organizationId,
              paidAt: null,
              dueDate: { lte: endOfToday },
            },
          }),
          prisma.appointmentInstallment.count({
            where: {
              paidAt: null,
              dueDate: { lte: endOfToday },
              appointment: { organizationId },
            },
          }),
        ])
      : [0, 0]

    const notificationsCount = openManualReceivables + openInstallments

    return (
      <SidebarDashboard
        isClinicOwner={isClinicOwner}
        canViewReports={canViewReports}
        userName={session?.user?.name ?? null}
        userEmail={session?.user?.email ?? null}
        userImage={session?.user?.image ?? null}
        notificationsCount={notificationsCount}
      >
        {children}
      </SidebarDashboard>
    )
}