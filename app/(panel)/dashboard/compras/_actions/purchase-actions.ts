"use server"

import { z } from "zod"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"

const createSupplierSchema = z.object({
  name: z.string().min(1, "Nome do fornecedor é obrigatório"),
  email: z.string().email("E-mail inválido").optional(),
  phone: z.string().optional(),
  document: z.string().optional(),
  notes: z.string().optional(),
})

const createPurchaseSchema = z.object({
  supplierId: z.string().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1, "Selecione um produto"),
        quantity: z.number().int().positive("Quantidade deve ser maior que zero"),
        unitCostCents: z.number().int().nonnegative("Custo inválido"),
      }),
    )
    .min(1, "Adicione pelo menos 1 item"),
  notes: z.string().optional(),
})

export async function createSupplier(input: z.infer<typeof createSupplierSchema>) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Não autorizado" }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) return { error: "Empresa não identificada" }

  const parsed = createSupplierSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" }

  try {
    const supplier = await prisma.supplier.create({
      data: {
        organizationId,
        name: parsed.data.name,
        email: parsed.data.email || undefined,
        phone: parsed.data.phone || undefined,
        document: parsed.data.document || undefined,
        notes: parsed.data.notes || undefined,
      },
    })
    revalidatePath("/dashboard/compras")
    return { data: supplier }
  } catch (error) {
    console.error(error)
    return { error: "Não foi possível cadastrar fornecedor" }
  }
}

export async function createPurchase(input: z.infer<typeof createPurchaseSchema>) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Não autorizado" }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) return { error: "Empresa não identificada" }

  const parsed = createPurchaseSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" }

  try {
    const productIds = [...new Set(parsed.data.lines.map((l) => l.productId))]
    const products = await prisma.product.findMany({
      where: { organizationId, active: true, id: { in: productIds } },
      select: { id: true, name: true, unit: true },
    })
    if (products.length !== productIds.length) return { error: "Produto inválido" }
    const productMap = new Map(products.map((p) => [p.id, p]))

    if (parsed.data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: parsed.data.supplierId, organizationId, active: true },
        select: { id: true },
      })
      if (!supplier) return { error: "Fornecedor inválido" }
    }

    const linesData = parsed.data.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      unitCostCents: line.unitCostCents,
      lineTotalCents: line.quantity * line.unitCostCents,
    }))
    const totalCents = linesData.reduce((sum, line) => sum + line.lineTotalCents, 0)

    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          organizationId,
          supplierId: parsed.data.supplierId || null,
          status: "CONFIRMED",
          totalCents,
          notes: parsed.data.notes || undefined,
          lines: {
            create: linesData,
          },
        },
      })

      for (const line of linesData) {
        const product = productMap.get(line.productId)
        if (!product) continue

        const stockItem = await tx.stockItem.upsert({
          where: {
            organizationId_name: {
              organizationId,
              name: product.name,
            },
          },
          update: {
            currentQuantity: { increment: line.quantity },
          },
          create: {
            organizationId,
            name: product.name,
            unit: product.unit || "un",
            currentQuantity: line.quantity,
            minimumQuantity: 0,
            active: true,
          },
          select: { id: true },
        })

        await tx.stockMovement.create({
          data: {
            stockItemId: stockItem.id,
            kind: "IN",
            quantity: line.quantity,
            note: `Entrada por compra ${purchase.id}`,
            createdByUserId: session.user.id,
          },
        })
      }
    })

    revalidatePath("/dashboard/compras")
    return { data: "Compra registrada com sucesso" }
  } catch (error) {
    console.error(error)
    return { error: "Não foi possível registrar compra" }
  }
}

export async function cancelPurchase(id: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Não autorizado" }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) return { error: "Empresa não identificada" }

  try {
    const purchase = await prisma.purchase.findFirst({
      where: { id, organizationId },
      include: {
        lines: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    })
    if (!purchase) return { error: "Compra não encontrada" }
    if (purchase.status === "CANCELLED") return { error: "Compra já cancelada" }

    await prisma.$transaction(async (tx) => {
      await tx.purchase.update({
        where: { id },
        data: { status: "CANCELLED" },
      })

      for (const line of purchase.lines) {
        const stockItem = await tx.stockItem.findUnique({
          where: {
            organizationId_name: {
              organizationId,
              name: line.product.name,
            },
          },
          select: { id: true },
        })
        if (!stockItem) continue

        await tx.stockItem.update({
          where: { id: stockItem.id },
          data: { currentQuantity: { decrement: line.quantity } },
        })

        await tx.stockMovement.create({
          data: {
            stockItemId: stockItem.id,
            kind: "OUT",
            quantity: line.quantity,
            note: `Estorno da compra ${purchase.id}`,
            createdByUserId: session.user.id,
          },
        })
      }
    })

    revalidatePath("/dashboard/compras")
    return { data: "Compra cancelada com sucesso" }
  } catch (error) {
    console.error(error)
    return { error: "Não foi possível cancelar compra" }
  }
}

