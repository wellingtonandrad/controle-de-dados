import prisma from "@/lib/prisma"

export type MrpRow = {
  productId: string
  name: string
  sku: string
  itemType: string
  requiredQty: number
  onHand: number
  shortage: number
  suggestProduce: boolean
}

/** Demanda agregada de OPs abertas vs estoque (visão MRP simplificada). */
export async function getMrpShortages(organizationId: string): Promise<MrpRow[]> {
  const [openOrders, stockItems, activeBoms] = await Promise.all([
    prisma.productionOrder.findMany({
      where: {
        organizationId,
        status: { notIn: ["FINISHED", "CANCELLED"] },
      },
      include: {
        bom: {
          include: {
            items: {
              include: {
                componentProduct: { select: { id: true, name: true, sku: true, itemType: true } },
              },
            },
          },
        },
      },
    }),
    prisma.stockItem.findMany({
      where: { organizationId },
      select: { name: true, currentQuantity: true },
    }),
    prisma.billOfMaterial.findMany({
      where: { organizationId, active: true },
      select: { productId: true },
    }),
  ])

  const bomParentIds = new Set(activeBoms.map((b) => b.productId))
  const stockByName = new Map(stockItems.map((s) => [s.name, s.currentQuantity]))

  const agg = new Map<string, { required: number; name: string; sku: string; itemType: string }>()
  for (const op of openOrders) {
    const remaining = Math.max(0, op.plannedQuantity - op.producedQuantity - op.scrapQuantity)
    for (const item of op.bom.items) {
      const q = Math.ceil(item.quantity * remaining * (1 + (item.lossPercent ?? 0) / 100))
      const p = item.componentProduct
      const cur = agg.get(p.id) ?? { required: 0, name: p.name, sku: p.sku, itemType: p.itemType }
      cur.required += q
      agg.set(p.id, cur)
    }
  }

  const rows: MrpRow[] = []
  for (const [productId, v] of agg) {
    const onHand = stockByName.get(v.name) ?? 0
    const shortage = Math.max(0, v.required - onHand)
    rows.push({
      productId,
      name: v.name,
      sku: v.sku,
      itemType: v.itemType,
      requiredQty: v.required,
      onHand,
      shortage,
      suggestProduce: bomParentIds.has(productId),
    })
  }

  rows.sort((a, b) => b.shortage - a.shortage || a.name.localeCompare(b.name, "pt-BR"))
  return rows
}
