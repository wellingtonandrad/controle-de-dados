"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { recordAudit } from "@/lib/audit/record-audit"

const createItemSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  unit: z.string().min(1, "Unidade é obrigatória").max(12),
  currentQuantity: z.number().int().min(0),
  minimumQuantity: z.number().int().min(0),
})

const movementSchema = z.object({
  stockItemId: z.string().min(1),
  kind: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.number().int().positive(),
  note: z.string().max(200).optional(),
})

const consumptionSchema = z.object({
  serviceId: z.string().min(1),
  stockItemId: z.string().min(1),
  quantity: z.number().int().positive(),
})

async function organizationIdOrError() {
  const session = await auth()
  if (!session?.user?.id) return { error: "Usuário não encontrado" as const }
  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) return { error: "Empresa não identificada" as const }
  return { organizationId, userId: session.user.id }
}

export async function createStockItem(raw: z.infer<typeof createItemSchema>) {
  const parsed = createItemSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const ctx = await organizationIdOrError()
  if ("error" in ctx) return { error: ctx.error }

  try {
    const data = parsed.data
    const item = await prisma.stockItem.create({
      data: {
        organizationId: ctx.organizationId,
        name: data.name.trim(),
        unit: data.unit.trim(),
        currentQuantity: data.currentQuantity,
        minimumQuantity: data.minimumQuantity,
      },
    })

    if (data.currentQuantity > 0) {
      await prisma.stockMovement.create({
        data: {
          stockItemId: item.id,
          kind: "ADJUSTMENT",
          quantity: data.currentQuantity,
          note: "Saldo inicial",
        },
      })
    }

    revalidatePath("/dashboard/estoque")
    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      category: "STOCK",
      action: "stock.item.create",
      summary: `Material cadastrado: ${item.name} (${item.currentQuantity} ${item.unit})`,
      entityType: "StockItem",
      entityId: item.id,
    })
    return { data: "Material cadastrado." }
  } catch {
    return { error: "Não foi possível cadastrar o material." }
  }
}

export async function createStockMovement(raw: z.infer<typeof movementSchema>) {
  const parsed = movementSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const ctx = await organizationIdOrError()
  if ("error" in ctx) return { error: ctx.error }

  try {
    let movementItemName = ""
    await prisma.$transaction(async (tx) => {
      const item = await tx.stockItem.findFirst({
        where: { id: parsed.data.stockItemId, organizationId: ctx.organizationId, active: true },
      })
      if (!item) throw new Error("Material não encontrado")
      movementItemName = item.name

      let nextQty = item.currentQuantity
      if (parsed.data.kind === "IN") nextQty += parsed.data.quantity
      if (parsed.data.kind === "OUT") nextQty -= parsed.data.quantity
      if (parsed.data.kind === "ADJUSTMENT") nextQty = parsed.data.quantity

      if (nextQty < 0) {
        throw new Error("Saldo insuficiente para saída.")
      }

      await tx.stockItem.update({
        where: { id: item.id },
        data: { currentQuantity: nextQty },
      })

      await tx.stockMovement.create({
        data: {
          stockItemId: item.id,
          kind: parsed.data.kind,
          quantity: parsed.data.quantity,
          note: parsed.data.note?.trim() || null,
        },
      })
    })

    revalidatePath("/dashboard/estoque")
    await recordAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      category: "STOCK",
      action: "stock.movement.create",
      summary: `Movimento ${parsed.data.kind} · ${parsed.data.quantity} · ${movementItemName}`,
      entityType: "StockItem",
      entityId: parsed.data.stockItemId,
      metadata: { kind: parsed.data.kind, quantity: parsed.data.quantity },
    })
    return { data: "Movimentação registrada." }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Falha ao movimentar estoque." }
  }
}

export async function upsertServiceConsumption(raw: z.infer<typeof consumptionSchema>) {
  const parsed = consumptionSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message }
  const ctx = await organizationIdOrError()
  if ("error" in ctx) return { error: ctx.error }

  try {
    const service = await prisma.service.findFirst({
      where: { id: parsed.data.serviceId, organizationId: ctx.organizationId },
      select: { id: true },
    })
    const stockItem = await prisma.stockItem.findFirst({
      where: { id: parsed.data.stockItemId, organizationId: ctx.organizationId, active: true },
      select: { id: true },
    })
    if (!service || !stockItem) {
      return { error: "Servico ou material invalido para esta empresa." }
    }

    await prisma.serviceStockConsumption.upsert({
      where: {
        serviceId_stockItemId: {
          serviceId: parsed.data.serviceId,
          stockItemId: parsed.data.stockItemId,
        },
      },
      update: { quantity: parsed.data.quantity },
      create: parsed.data,
    })

    revalidatePath("/dashboard/estoque")
    return { data: "Consumo automático atualizado." }
  } catch {
    return { error: "Não foi possível salvar o consumo automático." }
  }
}

export async function removeServiceConsumption(id: string) {
  const ctx = await organizationIdOrError()
  if ("error" in ctx) return { error: ctx.error }

  try {
    const found = await prisma.serviceStockConsumption.findFirst({
      where: {
        id,
        service: { organizationId: ctx.organizationId },
      },
      select: { id: true },
    })
    if (!found) return { error: "Configuração não encontrada." }

    await prisma.serviceStockConsumption.delete({ where: { id } })
    revalidatePath("/dashboard/estoque")
    return { data: "Configuração removida." }
  } catch {
    return { error: "Falha ao remover configuração." }
  }
}

