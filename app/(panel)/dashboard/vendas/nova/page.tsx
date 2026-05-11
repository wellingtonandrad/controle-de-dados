import getSession from "@/lib/getSession"
import { redirect } from "next/navigation"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { hasOrganizationPermission } from "@/app/utils/auth/rbac"
import prisma from "@/lib/prisma"
import { NovaVendaForm } from "../_components/nova-venda-form"
import { ErpPageHeader } from "../../_components/erp-page-header"

export default async function NovaVendaPage() {
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    redirect("/acesso-empresa")
  }

  const canManageSales = await hasOrganizationPermission({
    session,
    organizationId,
    permission: "sales:manage",
  })
  if (!canManageSales) {
    redirect("/dashboard/vendas")
  }

  const [products, customers] = await Promise.all([
    prisma.product.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ErpPageHeader
        title="Nova venda"
        description="Selecione cliente, produtos e quantidades. O total é calculado automaticamente."
      />
      <NovaVendaForm products={products} customers={customers} />
    </div>
  )
}
