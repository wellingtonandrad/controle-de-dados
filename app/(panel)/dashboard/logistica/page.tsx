import getSession from "@/lib/getSession"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { formatCurrency } from "@/app/utils/formatCurrency"
import { LogisticaHub } from "./_components/logistica-hub"
import { requireErpModule } from "@/lib/erp/require-module"

export default async function LogisticaPage() {
  const session = await getSession()
  if (!session) redirect("/")

  await requireErpModule("LOGISTICS")

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) redirect("/acesso-empresa")

  const [layers, trips, sales] = await Promise.all([
    prisma.geoMapLayer.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.deliveryTrip.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        gpsPoints: { orderBy: { recordedAt: "asc" } },
        sale: {
          select: {
            id: true,
            totalCents: true,
            customer: { select: { name: true } },
          },
        },
      },
    }),
    prisma.sale.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 120,
      select: {
        id: true,
        totalCents: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    }),
  ])

  const saleOptions = sales.map((s) => {
    const name = s.customer?.name?.trim() || "Cliente"
    const short = s.id.slice(-6)
    const total = formatCurrency(s.totalCents / 100)
    return {
      id: s.id,
      label: `${name} · …${short} · ${total}`,
    }
  })

  const layersDto = layers.map((l) => ({
    id: l.id,
    name: l.name,
    category: l.category,
    geoJson: l.geoJson,
    sourceFileName: l.sourceFileName,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }))

  const tripsDto = trips.map((t) => ({
    id: t.id,
    referenceCode: t.referenceCode,
    description: t.description,
    driverLabel: t.driverLabel,
    vehicleLabel: t.vehicleLabel,
    status: t.status,
    saleId: t.saleId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    gpsPoints: t.gpsPoints.map((p) => ({
      id: p.id,
      latitude: p.latitude,
      longitude: p.longitude,
      recordedAt: p.recordedAt.toISOString(),
      subject: p.subject,
      deliveryStatus: p.deliveryStatus,
      note: p.note,
      createdAt: p.createdAt.toISOString(),
    })),
    sale: t.sale
      ? {
          id: t.sale.id,
          totalCents: t.sale.totalCents,
          customerName: t.sale.customer?.name ?? null,
        }
      : null,
  }))

  const collectorDisplayName =
    session.user?.name?.trim() || session.user?.email?.split("@")[0] || "Coletor"

  return (
    <main className="min-h-0 bg-slate-50/50 px-4 py-6 sm:px-6 lg:py-8">
      <LogisticaHub
        layers={layersDto}
        trips={tripsDto}
        saleOptions={saleOptions}
        collectorDisplayName={collectorDisplayName}
      />
    </main>
  )
}
