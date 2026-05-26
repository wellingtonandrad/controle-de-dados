import getSession from "@/lib/getSession"
import { redirect } from "next/navigation"
import { getUserData } from "./_data-access/get-info-user"
import { ProfileContent } from "./_components/profile"
import { OrganizationModulesCard } from "./_components/organization-modules-card"
import { ErpPageHeader } from "../_components/erp-page-header"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import prisma from "@/lib/prisma"
import { normalizeEnabledModules } from "@/lib/erp/vertical-modules"

export default async function Profile() {
  const session = await getSession()

  if (!session?.user?.id) {
    redirect("/")
  }

  const user = await getUserData({ userId: session.user.id })

  if (!user) {
    redirect("/")
  }

  const isOwner = session.user.organizationRole === "OWNER"
  const organizationId = getActiveOrganizationId(session)

  const organization =
    isOwner && organizationId
      ? await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true, enabledModules: true },
        })
      : null

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <ErpPageHeader
        title="Configurações"
        description="Seus dados pessoais e, se você for titular, os módulos plugáveis da empresa."
      />
      <ProfileContent user={user} />
      {organization ? (
        <OrganizationModulesCard
          organizationName={organization.name}
          enabledModules={normalizeEnabledModules(organization.enabledModules)}
        />
      ) : null}
    </div>
  )
}
