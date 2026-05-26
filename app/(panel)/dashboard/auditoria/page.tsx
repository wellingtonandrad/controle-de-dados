import getSession from "@/lib/getSession"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { ErpPageHeader } from "../_components/erp-page-header"
import { AuditoriaContent } from "./_components/auditoria-content"
import { normalizeEnabledModules } from "@/lib/erp/vertical-modules"

export default async function AuditoriaPage() {
  const session = await getSession()
  if (!session) redirect("/")

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) redirect("/acesso-empresa")

  if (session.user.organizationRole !== "OWNER" && session.user.organizationRole !== "MANAGER") {
    redirect("/dashboard/overview")
  }

  const logs = await prisma.auditLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { name: true, email: true } },
    },
  })

  const rows = logs.map((log) => ({
    id: log.id,
    category: log.category,
    action: log.action,
    summary: log.summary,
    entityType: log.entityType,
    entityId: log.entityId,
    createdAt: log.createdAt.toISOString(),
    userName: log.user?.name ?? null,
    userEmail: log.user?.email ?? null,
  }))

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { enabledModules: true },
  })

  return (
    <main className="min-h-0 bg-slate-50/50 px-4 py-6 sm:px-6 lg:py-8">
      <AuditoriaContent
        logs={rows}
        enabledModules={normalizeEnabledModules(org?.enabledModules)}
      />
    </main>
  )
}
