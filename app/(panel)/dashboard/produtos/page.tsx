import getSession from "@/lib/getSession"
import { redirect } from "next/navigation"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import prisma from "@/lib/prisma"
import { ProdutosContent } from "./_components/produtos-content"

export default async function ProdutosPage() {
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    redirect("/acesso-empresa")
  }

  const products = await prisma.product.findMany({
    where: { organizationId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  })

  return <ProdutosContent products={products} />
}
