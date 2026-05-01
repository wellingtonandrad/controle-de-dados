"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { revalidatePath } from "next/cache"

type ActionResult = { error?: string; ok?: true }

async function getContext() {
  const session = await auth()
  if (!session?.user?.id) return { error: "Sessão inválida." } as const
  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) return { error: "Empresa não identificada." } as const
  return { organizationId, userId: session.user.id } as const
}

export async function createProductionOrder(input: {
  bomId: string
  productId: string
  plannedQuantity: number
  plannedStart?: string
  plannedEnd?: string
  notes?: string
}): Promise<ActionResult> {
  const ctx = await getContext()
  if ("error" in ctx) return { error: ctx.error }
  if (!input.bomId || !input.productId) return { error: "Selecione BOM e produto." }
  if (!Number.isFinite(input.plannedQuantity) || input.plannedQuantity <= 0) {
    return { error: "Quantidade planejada inválida." }
  }

  try {
    const bom = await prisma.billOfMaterial.findFirst({
      where: { id: input.bomId, organizationId: ctx.organizationId },
      include: { items: true },
    })
    if (!bom) return { error: "BOM não encontrada." }
    if (bom.productId !== input.productId) {
      return { error: "A BOM selecionada não pertence ao produto informado." }
    }

    await prisma.$transaction(async (tx) => {
      const order = await tx.productionOrder.create({
        data: {
          organizationId: ctx.organizationId,
          bomId: input.bomId,
          productId: input.productId,
          plannedQuantity: input.plannedQuantity,
          plannedStart: input.plannedStart ? new Date(input.plannedStart) : null,
          plannedEnd: input.plannedEnd ? new Date(input.plannedEnd) : null,
          notes: input.notes?.trim() || null,
        },
      })

      for (const item of bom.items) {
        const grossQty = item.quantity * input.plannedQuantity
        const plannedQty = Math.ceil(grossQty * (1 + (item.lossPercent ?? 0) / 100))
        await tx.productionMaterialPlan.create({
          data: {
            productionOrderId: order.id,
            componentProductId: item.componentProductId,
            plannedQty,
          },
        })
      }
    })

    revalidatePath("/dashboard/producao")
    revalidatePath("/dashboard/necessidades")
    return { ok: true }
  } catch {
    return { error: "Não foi possível criar a ordem de produção." }
  }
}

export async function addProductionReport(input: {
  productionOrderId: string
  workCenterId?: string
  goodQuantity: number
  scrapQuantity?: number
  runtimeMin?: number
  notes?: string
}): Promise<ActionResult> {
  const ctx = await getContext()
  if ("error" in ctx) return { error: ctx.error }
  if (!input.productionOrderId) return { error: "Selecione a ordem de produção." }

  const good = Number.isFinite(input.goodQuantity) ? Number(input.goodQuantity) : 0
  const scrap = Number.isFinite(input.scrapQuantity) ? Number(input.scrapQuantity ?? 0) : 0
  const runtime = Number.isFinite(input.runtimeMin) ? Number(input.runtimeMin ?? 0) : 0
  if (good < 0 || scrap < 0 || runtime < 0) return { error: "Valores inválidos no apontamento." }

  try {
    const order = await prisma.productionOrder.findFirst({
      where: { id: input.productionOrderId, organizationId: ctx.organizationId },
      include: {
        bom: {
          include: {
            items: {
              include: {
                componentProduct: {
                  select: { name: true, unit: true },
                },
              },
            },
          },
        },
        product: { select: { name: true, unit: true } },
        materialPlans: { select: { id: true, componentProductId: true } },
      },
    })
    if (!order) return { error: "Ordem de produção não encontrada." }
    if (order.status === "FINISHED" || order.status === "CANCELLED") {
      return { error: "Não é possível apontar em ordem finalizada ou cancelada." }
    }
    const processedQty = good + scrap
    if (processedQty <= 0) {
      return { error: "Informe quantidade boa ou refugo para apontar." }
    }

    const requirement = order.bom.items.map((item) => {
      const grossQty = item.quantity * processedQty
      const totalQty = grossQty * (1 + (item.lossPercent ?? 0) / 100)
      return {
        componentProductId: item.componentProductId,
        productName: item.componentProduct.name,
        requiredQty: Math.ceil(totalQty),
      }
    })

    const stockItems = await prisma.stockItem.findMany({
      where: {
        organizationId: ctx.organizationId,
        name: { in: requirement.map((r) => r.productName) },
      },
      select: { id: true, name: true, currentQuantity: true, unit: true },
    })
    const stockByName = new Map(stockItems.map((s) => [s.name, s]))

    for (const req of requirement) {
      const stock = stockByName.get(req.productName)
      if (!stock) {
        return { error: `Sem item de estoque para componente: ${req.productName}.` }
      }
      if (stock.currentQuantity < req.requiredQty) {
        return {
          error: `Estoque insuficiente de ${req.productName} (${stock.currentQuantity} < ${req.requiredQty}).`,
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.productionReport.create({
        data: {
          productionOrderId: input.productionOrderId,
          workCenterId: input.workCenterId || null,
          goodQuantity: good,
          scrapQuantity: scrap,
          runtimeMin: runtime,
          notes: input.notes?.trim() || null,
          createdByUserId: ctx.userId,
        },
      })

      await tx.productionOrder.update({
        where: { id: input.productionOrderId },
        data: {
          producedQuantity: order.producedQuantity + good,
          scrapQuantity: order.scrapQuantity + scrap,
          status: order.status === "PLANNED" || order.status === "RELEASED" ? "IN_PROGRESS" : order.status,
        },
      })

      for (const req of requirement) {
        const stock = stockByName.get(req.productName)!
        await tx.stockItem.update({
          where: { id: stock.id },
          data: { currentQuantity: { decrement: req.requiredQty } },
        })
        await tx.stockMovement.create({
          data: {
            stockItemId: stock.id,
            kind: "OUT",
            quantity: req.requiredQty,
            note: `Consumo OP ${order.id.slice(0, 8)} (${processedQty} un processadas)`,
            createdByUserId: ctx.userId,
          },
        })
      }

      if (order.materialPlans.length > 0) {
        for (const req of requirement) {
          const plan = order.materialPlans.find((p) => p.componentProductId === req.componentProductId)
          if (plan) {
            await tx.productionMaterialPlan.update({
              where: { id: plan.id },
              data: { consumedQty: { increment: req.requiredQty } },
            })
          }
        }
      }

      const outputStock = await tx.stockItem.upsert({
        where: {
          organizationId_name: {
            organizationId: ctx.organizationId,
            name: order.product.name,
          },
        },
        create: {
          organizationId: ctx.organizationId,
          name: order.product.name,
          unit: order.product.unit,
          currentQuantity: 0,
          minimumQuantity: 0,
        },
        update: {},
      })
      if (good > 0) {
        await tx.stockItem.update({
          where: { id: outputStock.id },
          data: { currentQuantity: { increment: good } },
        })
        await tx.stockMovement.create({
          data: {
            stockItemId: outputStock.id,
            kind: "IN",
            quantity: good,
            note: `Produção OP ${order.id.slice(0, 8)} (boa)`,
            createdByUserId: ctx.userId,
          },
        })
      }
    })

    revalidatePath("/dashboard/producao")
    revalidatePath("/dashboard/necessidades")
    return { ok: true }
  } catch {
    return { error: "Não foi possível registrar o apontamento." }
  }
}

export async function updateProductionOrderStatus(input: {
  productionOrderId: string
  status: "PLANNED" | "RELEASED" | "IN_PROGRESS" | "PAUSED" | "FINISHED" | "CANCELLED"
}): Promise<ActionResult> {
  const ctx = await getContext()
  if ("error" in ctx) return { error: ctx.error }

  try {
    const current = await prisma.productionOrder.findFirst({
      where: { id: input.productionOrderId, organizationId: ctx.organizationId },
      select: { id: true },
    })
    if (!current) return { error: "Ordem de produção não encontrada." }

    await prisma.productionOrder.update({
      where: { id: input.productionOrderId },
      data: {
        status: input.status,
        startedAt: input.status === "IN_PROGRESS" ? new Date() : undefined,
        finishedAt: input.status === "FINISHED" ? new Date() : undefined,
      },
    })
    revalidatePath("/dashboard/producao")
    revalidatePath("/dashboard/necessidades")
    return { ok: true }
  } catch {
    return { error: "Não foi possível atualizar o status." }
  }
}
