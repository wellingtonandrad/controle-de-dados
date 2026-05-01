"use server"

import { auth } from "@/lib/auth"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const productFields = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  sku: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  unit: z.string().trim().min(1),
  priceCents: z.number().int().positive("Preço deve ser maior que zero"),
  costCents: z.number().int().nonnegative().optional(),
})

const createSchema = productFields

const updateSchema = productFields.extend({
  id: z.string().min(1),
  active: z.boolean().optional(),
})

export type CreateProductInput = z.infer<typeof createSchema>
export type UpdateProductInput = z.infer<typeof updateSchema>

const AUTO_SKU_PREFIX = "PRD-"
const AUTO_SKU_PAD = 4

function parseAutoSkuNumber(sku?: string | null): number | null {
  if (!sku?.startsWith(AUTO_SKU_PREFIX)) return null
  const n = Number.parseInt(sku.slice(AUTO_SKU_PREFIX.length), 10)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

async function nextAutoSkuForOrganization(organizationId: string): Promise<string> {
  const rows = await prisma.product.findMany({
    where: {
      organizationId,
      sku: {
        startsWith: AUTO_SKU_PREFIX,
      },
    },
    select: { sku: true },
    take: 200,
    orderBy: { createdAt: "desc" },
  })

  let max = 0
  for (const row of rows) {
    const n = parseAutoSkuNumber(row.sku)
    if (n && n > max) max = n
  }

  const next = String(max + 1).padStart(AUTO_SKU_PAD, "0")
  return `${AUTO_SKU_PREFIX}${next}`
}

export async function createProduct(input: CreateProductInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Não autorizado" }
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    return { error: "Empresa não identificada" }
  }

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const manualSku = parsed.data.sku
  const maxAttempts = manualSku ? 1 : 5

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const skuToSave =
      manualSku ?? (await nextAutoSkuForOrganization(organizationId))

    try {
      const row = await prisma.product.create({
        data: {
          organizationId,
          name: parsed.data.name,
          sku: skuToSave,
          unit: parsed.data.unit || "un",
          priceCents: parsed.data.priceCents,
          costCents: parsed.data.costCents,
        },
      })
      revalidatePath("/dashboard/produtos")
      return { data: row }
    } catch (e) {
      const code =
        typeof e === "object" && e && "code" in e
          ? String((e as { code?: string }).code)
          : ""
      const isUniqueViolation = code === "P2002"
      const canRetryAuto = !manualSku && isUniqueViolation && attempt < maxAttempts
      if (canRetryAuto) {
        continue
      }
      console.error(e)
      return { error: "Não foi possível cadastrar o produto (SKU duplicado?)" }
    }
  }

  return { error: "Não foi possível cadastrar o produto" }
}

export async function updateProduct(input: UpdateProductInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Não autorizado" }
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    return { error: "Empresa não identificada" }
  }

  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  try {
    const existing = await prisma.product.findFirst({
      where: { id: parsed.data.id, organizationId },
    })
    if (!existing) {
      return { error: "Produto não encontrado" }
    }

    const row = await prisma.product.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        sku: parsed.data.sku,
        unit: parsed.data.unit || "un",
        priceCents: parsed.data.priceCents,
        costCents: parsed.data.costCents,
        ...(parsed.data.active !== undefined
          ? { active: parsed.data.active }
          : {}),
      },
    })
    revalidatePath("/dashboard/produtos")
    return { data: row }
  } catch (e) {
    console.error(e)
    return { error: "Não foi possível atualizar o produto" }
  }
}

export async function setProductActive(id: string, active: boolean) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Não autorizado" }
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    return { error: "Empresa não identificada" }
  }

  try {
    const existing = await prisma.product.findFirst({
      where: { id, organizationId },
    })
    if (!existing) {
      return { error: "Produto não encontrado" }
    }

    await prisma.product.update({
      where: { id },
      data: { active },
    })
    revalidatePath("/dashboard/produtos")
    return { ok: true as const }
  } catch (e) {
    console.error(e)
    return { error: "Não foi possível atualizar o status" }
  }
}
