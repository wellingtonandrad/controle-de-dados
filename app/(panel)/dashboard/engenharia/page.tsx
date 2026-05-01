import { redirect } from "next/navigation"
import getSession from "@/lib/getSession"
import prisma from "@/lib/prisma"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { EngineeringContent } from "./_components/engineering-content"

export default async function EngenhariaPage() {
  const session = await getSession()
  if (!session) redirect("/")

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) redirect("/acesso-empresa")

  const [products, workCenters, boms] = await Promise.all([
    prisma.product.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true, itemType: true },
    }),
    prisma.workCenter.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, capacityPerDayMin: true, active: true },
    }),
    prisma.billOfMaterial.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: "desc" }],
      include: {
        product: { select: { id: true, name: true, sku: true } },
        items: { include: { componentProduct: { select: { name: true, sku: true } } } },
        routingSteps: { include: { workCenter: { select: { name: true } } } },
      },
      take: 50,
    }),
  ])

  return <EngineeringContent products={products} workCenters={workCenters} boms={boms} />
}
