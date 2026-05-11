import getSession from "@/lib/getSession"
import { redirect } from "next/navigation"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { hasOrganizationPermission } from "@/app/utils/auth/rbac"
import prisma from "@/lib/prisma"
import { VendasListContent } from "./_components/vendas-list-content"

export default async function VendasPage() {
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    redirect("/acesso-empresa")
  }

  const canViewSales = await hasOrganizationPermission({
    session,
    organizationId,
    permission: "sales:view",
  })
  if (!canViewSales) {
    redirect("/dashboard/overview")
  }

  const sales = await prisma.sale.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      customer: true,
      lines: { include: { product: true } },
    },
  })

  return <VendasListContent sales={sales} />
}
