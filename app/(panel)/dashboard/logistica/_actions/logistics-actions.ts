"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { kmzOrKmlToFeatureCollection } from "@/lib/logistics/kmz-to-geojson"
import { recordAudit } from "@/lib/audit/record-audit"
import type { Prisma } from "@/lib/generated/prisma"

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024

const geoCategorySchema = z.enum([
  "DELIVERY_REGION",
  "FACTORY_SITE",
  "NEIGHBORHOOD_BOUNDARY",
  "PLANNED_ROUTE",
])

const tripStatusSchema = z.enum(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"])

const subjectSchema = z.enum(["DELIVERER", "COMPANY_VEHICLE"])

const progressSchema = z.enum([
  "SCHEDULED",
  "LOADING",
  "OUT_FOR_DELIVERY",
  "IN_TRANSIT",
  "AT_CUSTOMER",
  "DELIVERED",
  "EXCEPTION",
  "RETURNING",
  "CANCELLED",
])

async function organizationIdOrError() {
  const session = await auth()
  if (!session?.user?.id) return { error: "Usuário não encontrado" as const }
  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) return { error: "Empresa não identificada" as const }
  return { organizationId, userId: session.user.id }
}

export async function createGeoMapLayerFromUpload(formData: FormData) {
  const ctx = await organizationIdOrError()
  if ("error" in ctx) return { error: ctx.error }

  const name = String(formData.get("name") ?? "").trim()
  const categoryRaw = String(formData.get("category") ?? "")
  const file = formData.get("file")

  if (!name) return { error: "Informe um nome para a camada." }
  const cat = geoCategorySchema.safeParse(categoryRaw)
  if (!cat.success) return { error: "Tipo de camada inválido." }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo .kmz ou .kml." }
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Arquivo muito grande (máximo 6 MB)." }
  }

  const buf = new Uint8Array(await file.arrayBuffer())
  let parsed: ReturnType<typeof kmzOrKmlToFeatureCollection>
  try {
    parsed = kmzOrKmlToFeatureCollection(buf, file.name)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível ler o arquivo."
    return { error: msg }
  }

  const json = parsed.geojson as unknown as Prisma.InputJsonValue
  const jsonSize = JSON.stringify(parsed.geojson).length
  if (jsonSize > 5_500_000) {
    return { error: "Geometria resultante muito grande para armazenar. Simplifique o KML/KMZ." }
  }

  try {
    await prisma.geoMapLayer.create({
      data: {
        organizationId: ctx.organizationId,
        name,
        category: cat.data,
        geoJson: json,
        sourceFileName: parsed.sourceFileName,
      },
    })
    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      category: "LOGISTICS",
      action: "logistics.layer.import",
      summary: `Camada KMZ/KML: ${name}`,
      entityType: "GeoMapLayer",
    })
    revalidatePath("/dashboard/logistica")
    const hint = parsed.truncated ? " (algumas feições foram limitadas a 800 por desempenho)" : ""
    return { data: `Camada cadastrada.${hint}` as const }
  } catch {
    return { error: "Não foi possível salvar a camada." }
  }
}

export async function deleteGeoMapLayer(id: string) {
  const ctx = await organizationIdOrError()
  if ("error" in ctx) return { error: ctx.error }
  if (!id) return { error: "Camada inválida." }

  try {
    const res = await prisma.geoMapLayer.deleteMany({
      where: { id, organizationId: ctx.organizationId },
    })
    if (res.count === 0) return { error: "Camada não encontrada." }
    revalidatePath("/dashboard/logistica")
    return { data: "Camada removida." as const }
  } catch {
    return { error: "Não foi possível remover a camada." }
  }
}

const createTripSchema = z.object({
  referenceCode: z.string().max(80).optional(),
  description: z.string().max(500).optional(),
  driverLabel: z.string().max(120).optional(),
  vehicleLabel: z.string().max(120).optional(),
  saleId: z.string().optional(),
})

export async function createDeliveryTrip(raw: z.infer<typeof createTripSchema>) {
  const parsed = createTripSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  const ctx = await organizationIdOrError()
  if ("error" in ctx) return { error: ctx.error }

  const saleId = parsed.data.saleId?.trim() || undefined
  if (saleId) {
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, organizationId: ctx.organizationId },
      select: { id: true },
    })
    if (!sale) return { error: "Pedido (venda) não encontrado nesta empresa." }
  }

  try {
    const trip = await prisma.deliveryTrip.create({
      data: {
        organizationId: ctx.organizationId,
        referenceCode: parsed.data.referenceCode?.trim() || null,
        description: parsed.data.description?.trim() || null,
        driverLabel: parsed.data.driverLabel?.trim() || null,
        vehicleLabel: parsed.data.vehicleLabel?.trim() || null,
        saleId: saleId ?? null,
        status: "DRAFT",
      },
    })
    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      category: "LOGISTICS",
      action: "logistics.trip.create",
      summary: `Entrega criada · ${parsed.data.referenceCode?.trim() || trip.id.slice(-6)}`,
      entityType: "DeliveryTrip",
      entityId: trip.id,
    })
    revalidatePath("/dashboard/logistica")
    return { data: trip.id }
  } catch {
    return { error: "Não foi possível criar a entrega." }
  }
}

export async function setDeliveryTripStatus(input: { tripId: string; status: z.infer<typeof tripStatusSchema> }) {
  const parsed = z
    .object({ tripId: z.string().min(1), status: tripStatusSchema })
    .safeParse(input)
  if (!parsed.success) return { error: "Dados inválidos." }
  const ctx = await organizationIdOrError()
  if ("error" in ctx) return { error: ctx.error }

  try {
    const res = await prisma.deliveryTrip.updateMany({
      where: { id: parsed.data.tripId, organizationId: ctx.organizationId },
      data: { status: parsed.data.status },
    })
    if (res.count === 0) return { error: "Entrega não encontrada." }
    revalidatePath("/dashboard/logistica")
    return { data: "Status atualizado." as const }
  } catch {
    return { error: "Não foi possível atualizar o status." }
  }
}

const gpsPointSchema = z.object({
  tripId: z.string().min(1),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  recordedAt: z.string().min(1),
  subject: subjectSchema,
  deliveryStatus: progressSchema,
  note: z.string().max(300).optional(),
})

export async function addGpsTrackPoint(raw: z.infer<typeof gpsPointSchema>) {
  const parsed = gpsPointSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ponto inválido" }
  const ctx = await organizationIdOrError()
  if ("error" in ctx) return { error: ctx.error }

  const recorded = new Date(parsed.data.recordedAt)
  if (Number.isNaN(recorded.getTime())) {
    return { error: "Data/hora do ponto inválida." }
  }

  try {
    const trip = await prisma.deliveryTrip.findFirst({
      where: { id: parsed.data.tripId, organizationId: ctx.organizationId },
      select: { id: true, status: true },
    })
    if (!trip) return { error: "Entrega não encontrada." }
    if (trip.status === "COMPLETED" || trip.status === "CANCELLED") {
      return { error: "Não é possível lançar GPS em entrega encerrada ou cancelada." }
    }

    await prisma.gpsTrackPoint.create({
      data: {
        tripId: trip.id,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        recordedAt: recorded,
        subject: parsed.data.subject,
        deliveryStatus: parsed.data.deliveryStatus,
        note: parsed.data.note?.trim() || null,
      },
    })

    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      category: "LOGISTICS",
      action: "logistics.gps.add",
      summary: `GPS ${parsed.data.deliveryStatus} · ${parsed.data.latitude.toFixed(5)}, ${parsed.data.longitude.toFixed(5)}`,
      entityType: "DeliveryTrip",
      entityId: trip.id,
    })

    revalidatePath("/dashboard/logistica")
    return { data: "Ponto de GPS registrado." as const }
  } catch {
    return { error: "Não foi possível registrar o ponto." }
  }
}

export async function deleteDeliveryTrip(tripId: string) {
  const ctx = await organizationIdOrError()
  if ("error" in ctx) return { error: ctx.error }
  if (!tripId) return { error: "Entrega inválida." }

  try {
    const res = await prisma.deliveryTrip.deleteMany({
      where: { id: tripId, organizationId: ctx.organizationId },
    })
    if (res.count === 0) return { error: "Entrega não encontrada." }
    revalidatePath("/dashboard/logistica")
    return { data: "Entrega e histórico de GPS removidos." as const }
  } catch {
    return { error: "Não foi possível remover a entrega." }
  }
}
