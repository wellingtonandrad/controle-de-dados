import { redirect } from "next/navigation"
import getSession from "@/lib/getSession"
import prisma from "@/lib/prisma"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { ProductionContent } from "./_components/production-content"

export default async function ProducaoPage() {
  const session = await getSession()
  if (!session) redirect("/")

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) redirect("/acesso-empresa")

  const [boms, workCenters, orders] = await Promise.all([
    prisma.billOfMaterial.findMany({
      where: { organizationId, active: true },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true, sku: true } } },
      take: 50,
    }),
    prisma.workCenter.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, capacityPerDayMin: true },
    }),
    prisma.productionOrder.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        product: { select: { name: true, sku: true } },
        bom: {
          select: {
            version: true,
            items: {
              select: {
                quantity: true,
                lossPercent: true,
                componentProduct: { select: { name: true } },
              },
            },
            routingSteps: {
              select: { setupMin: true, cycleMin: true },
            },
          },
        },
        reports: {
          select: {
            id: true,
            goodQuantity: true,
            scrapQuantity: true,
            runtimeMin: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        materialPlans: {
          include: {
            componentProduct: { select: { name: true } },
          },
        },
      },
    }),
  ])

  const mappedOrders = orders.map((o) => {
    const { materialPlans, ...orderRest } = o
    const remainingQty = Math.max(0, o.plannedQuantity - o.producedQuantity - o.scrapQuantity)
    const materialRequirements = o.bom.items.map((item) => {
      const totalQty = Math.ceil(item.quantity * remainingQty * (1 + (item.lossPercent ?? 0) / 100))
      return {
        name: item.componentProduct.name,
        quantity: totalQty,
      }
    })
    const materialConsumption = materialPlans.map((p) => ({
      name: p.componentProduct.name,
      planned: p.plannedQty,
      consumed: p.consumedQty,
    }))

    const estimatedMinutes = o.bom.routingSteps.reduce((sum, step) => {
      return sum + step.setupMin + step.cycleMin * remainingQty
    }, 0)

    return {
      ...orderRest,
      createdAt: o.createdAt.toISOString(),
      reports: o.reports.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      materialRequirements,
      materialConsumption,
      remainingQty,
      estimatedMinutes,
    }
  })

  const openOrders = mappedOrders.filter((o) => !["FINISHED", "CANCELLED"].includes(o.status))
  const openOrdersCount = openOrders.length
  const totalEstimatedMinutes = openOrders.reduce((sum, o) => sum + o.estimatedMinutes, 0)
  const weeklyCapacityMinutes = workCenters.reduce((sum, w) => sum + 5 * w.capacityPerDayMin, 0)
  const utilizationPct = weeklyCapacityMinutes > 0 ? (totalEstimatedMinutes / weeklyCapacityMinutes) * 100 : 0

  return (
    <ProductionContent
      boms={boms}
      workCenters={workCenters}
      orders={mappedOrders}
      planningSummary={{
        openOrdersCount,
        totalEstimatedMinutes,
        weeklyCapacityMinutes,
        utilizationPct,
      }}
    />
  )
}
