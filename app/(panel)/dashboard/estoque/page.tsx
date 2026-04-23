import getSession from "@/lib/getSession"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id"
import { StockContent } from "./_components/stock-content"

export default async function EstoquePage() {
  const session = await getSession()
  if (!session) redirect("/")

  const clinicOwnerId = getClinicOwnerUserId(session)
  if (!clinicOwnerId) redirect("/acesso-clinica")

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

  const [stockItems, services, consumptions] = await Promise.all([
    prisma.stockItem.findMany({
      where: { userId: clinicOwnerId, active: true },
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
      where: { userId: clinicOwnerId, status: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.serviceStockConsumption.findMany({
      where: { service: { userId: clinicOwnerId } },
      orderBy: [{ service: { name: "asc" } }, { stockItem: { name: "asc" } }],
      select: {
        id: true,
        quantity: true,
        service: { select: { id: true, name: true } },
        stockItem: { select: { id: true, name: true, unit: true } },
      },
    }),
  ])

  return (
    <main>
      <StockContent
        stockItems={stockItems}
        services={services}
        consumptions={consumptions}
      />
    </main>
  )
}

