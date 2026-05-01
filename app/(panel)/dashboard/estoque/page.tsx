import getSession from "@/lib/getSession"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { StockContent } from "./_components/stock-content"

export default async function EstoquePage() {
  const session = await getSession()
  if (!session) redirect("/")

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) redirect("/acesso-empresa")

  const stockReady =
    typeof (prisma as unknown as { stockItem?: { findMany?: unknown } }).stockItem
      ?.findMany === "function" &&
    typeof (
      prisma as unknown as {
        serviceStockConsumption?: { findMany?: unknown }
      }
    ).serviceStockConsumption?.findMany === "function"

  if (!stockReady) {
    return (
      <main className="rounded-lg border bg-white p-4">
        <h1 className="text-lg font-semibold">Estoque</h1>
        <p className="mt-2 text-sm text-zinc-600">
          O servidor ainda está com o Prisma antigo em memória. Reinicie o{" "}
          <code>npm run dev</code> para carregar os novos modelos de estoque.
        </p>
      </main>
    )
  }

  const [stockItems, services, consumptions, movements] = await Promise.all([
    prisma.stockItem.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        unit: true,
        currentQuantity: true,
        minimumQuantity: true,
      },
    }),
    prisma.service.findMany({
      where: { organizationId, status: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.serviceStockConsumption.findMany({
      where: { service: { organizationId } },
      orderBy: [{ service: { name: "asc" } }, { stockItem: { name: "asc" } }],
      select: {
        id: true,
        quantity: true,
        service: { select: { id: true, name: true } },
        stockItem: { select: { id: true, name: true, unit: true } },
      },
    }),
    prisma.stockMovement.findMany({
      where: { stockItem: { organizationId } },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        kind: true,
        quantity: true,
        note: true,
        createdAt: true,
        stockItem: { select: { id: true, name: true, unit: true } },
      },
    }),
  ])

  return (
    <main className="min-h-0 bg-slate-50/50 px-4 py-6 sm:px-6 lg:py-8">
      <StockContent
        stockItems={stockItems}
        services={services}
        consumptions={consumptions}
        movements={movements.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      />
    </main>
  )
}

