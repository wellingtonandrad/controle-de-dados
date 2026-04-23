import { SidebarDashboard } from "./_components/sidebar"
import { requireClinicUser } from "@/app/utils/auth/require-clinic-user"
import getSession from "@/lib/getSession"
import { canAccessReports } from "@/app/utils/auth/can-access-reports"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}){
    await requireClinicUser()
    const session = await getSession()
    const isClinicOwner = session?.user?.clinicStaffRole === "OWNER"
    const canViewReports = canAccessReports(session)

    return(
        <>     
       <SidebarDashboard isClinicOwner={isClinicOwner} canViewReports={canViewReports}>
        {children}
        </SidebarDashboard>  
        </>
    )
}