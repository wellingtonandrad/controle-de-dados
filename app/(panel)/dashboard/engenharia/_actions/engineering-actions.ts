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

export async function createWorkCenter(input: {
  name: string
  code?: string
  capacityPerDayMin?: number
}): Promise<ActionResult> {
  const ctx = await getContext()
  if ("error" in ctx) return { error: ctx.error }
  if (!input.name.trim()) return { error: "Informe o nome do centro de trabalho." }

  try {
    await prisma.workCenter.create({
      data: {
        organizationId: ctx.organizationId,
        name: input.name.trim(),
        code: input.code?.trim() || null,
        capacityPerDayMin: input.capacityPerDayMin && input.capacityPerDayMin > 0 ? input.capacityPerDayMin : 480,
      },
    })
    revalidatePath("/dashboard/engenharia")
    return { ok: true }
  } catch {
    return { error: "Não foi possível criar o centro de trabalho." }
  }
}

export async function createBillOfMaterial(input: {
  productId: string
  version: string
  notes?: string
}): Promise<ActionResult> {
  const ctx = await getContext()
  if ("error" in ctx) return { error: ctx.error }
  if (!input.productId) return { error: "Selecione o produto pai." }
  if (!input.version.trim()) return { error: "Informe a versão da BOM." }

  try {
    await prisma.billOfMaterial.create({
      data: {
        organizationId: ctx.organizationId,
        productId: input.productId,
        version: input.version.trim(),
        notes: input.notes?.trim() || null,
      },
    })
    revalidatePath("/dashboard/engenharia")
    return { ok: true }
  } catch {
    return { error: "Não foi possível criar a BOM. Verifique se a versão já existe." }
  }
}

export async function addBomItem(input: {
  bomId: string
  componentProductId: string
  quantity: number
  lossPercent?: number
}): Promise<ActionResult> {
  const ctx = await getContext()
  if ("error" in ctx) return { error: ctx.error }
  if (!input.bomId || !input.componentProductId) return { error: "Selecione a BOM e o componente." }
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) return { error: "Quantidade inválida." }

  try {
    const bom = await prisma.billOfMaterial.findFirst({
      where: { id: input.bomId, organizationId: ctx.organizationId },
      select: { id: true, productId: true },
    })
    if (!bom) return { error: "BOM não encontrada." }
    if (bom.productId === input.componentProductId) {
      return { error: "O componente não pode ser o mesmo produto pai." }
    }

    await prisma.bomItem.create({
      data: {
        bomId: input.bomId,
        componentProductId: input.componentProductId,
        quantity: input.quantity,
        lossPercent: input.lossPercent && input.lossPercent > 0 ? input.lossPercent : 0,
      },
    })
    revalidatePath("/dashboard/engenharia")
    return { ok: true }
  } catch {
    return { error: "Não foi possível adicionar o componente." }
  }
}

export async function addRoutingStep(input: {
  bomId: string
  workCenterId: string
  sequence: number
  name: string
  setupMin?: number
  cycleMin?: number
}): Promise<ActionResult> {
  const ctx = await getContext()
  if ("error" in ctx) return { error: ctx.error }
  if (!input.bomId || !input.workCenterId) return { error: "Selecione BOM e centro de trabalho." }
  if (!input.name.trim()) return { error: "Informe o nome da operação." }
  if (!Number.isFinite(input.sequence) || input.sequence <= 0) return { error: "Sequência inválida." }

  try {
    const [bom, wc] = await Promise.all([
      prisma.billOfMaterial.findFirst({
        where: { id: input.bomId, organizationId: ctx.organizationId },
        select: { id: true },
      }),
      prisma.workCenter.findFirst({
        where: { id: input.workCenterId, organizationId: ctx.organizationId },
        select: { id: true },
      }),
    ])
    if (!bom || !wc) return { error: "BOM ou centro de trabalho não encontrado." }

    await prisma.routingStep.create({
      data: {
        bomId: input.bomId,
        workCenterId: input.workCenterId,
        sequence: input.sequence,
        name: input.name.trim(),
        setupMin: input.setupMin && input.setupMin > 0 ? input.setupMin : 0,
        cycleMin: input.cycleMin && input.cycleMin > 0 ? input.cycleMin : 0,
      },
    })
    revalidatePath("/dashboard/engenharia")
    return { ok: true }
  } catch {
    return { error: "Não foi possível adicionar a etapa do roteiro." }
  }
}
