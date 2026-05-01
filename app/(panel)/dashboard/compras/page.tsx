import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import getSession from "@/lib/getSession"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { ComprasContent } from "./_components/compras-content"

export default async function ComprasPage() {
  const session = await getSession()
  if (!session) redirect("/")

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) redirect("/acesso-empresa")

  const [suppliers, products, purchases, supplierAgg] = await Promise.all([
    prisma.supplier.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true },
    }),
    prisma.purchase.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        supplier: { select: { name: true } },
        lines: { include: { product: { select: { name: true } } } },
      },
    }),
    prisma.purchase.groupBy({
      by: ["supplierId"],
      where: {
        organizationId,
        status: "CONFIRMED",
        supplierId: { not: null },
      },
      _count: { _all: true },
      _sum: { totalCents: true },
      _max: { createdAt: true },
    }),
  ])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const monthPurchases = purchases.filter(
    (p) => p.createdAt >= monthStart && p.createdAt < nextMonthStart,
  )
  const monthPurchasesCount = monthPurchases.length
  const monthPurchasesTotalCents = monthPurchases.reduce((sum, p) => sum + p.totalCents, 0)
  const supplierHistoryMap = new Map(
    supplierAgg
      .filter((a) => a.supplierId)
      .map((a) => [
        a.supplierId as string,
        {
          purchasesCount: a._count._all,
          totalCents: a._sum.totalCents ?? 0,
          lastPurchaseAt: a._max.createdAt,
        },
      ]),
  )

  return (
    <ComprasContent
      suppliers={suppliers.map((s) => ({
        ...s,
        history: supplierHistoryMap.get(s.id) ?? {
          purchasesCount: 0,
          totalCents: 0,
          lastPurchaseAt: null,
        },
      }))}
      products={products}
      monthPurchasesCount={monthPurchasesCount}
      monthPurchasesTotalCents={monthPurchasesTotalCents}
      purchases={purchases.map((purchase) => ({
        id: purchase.id,
        createdAt: purchase.createdAt,
        totalCents: purchase.totalCents,
        status:
          purchase.status === "CONFIRMED"
            ? "Confirmada"
            : purchase.status === "CANCELLED"
              ? "Cancelada"
              : "Rascunho",
        supplierName: purchase.supplier?.name ?? null,
        productSummary: purchase.lines
          .map((line) => `${line.quantity}x ${line.product.name}`)
          .join(", "),
      }))}
    />
  )
}

