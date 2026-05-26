"use server"

import { auth } from "@/lib/auth"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { hasOrganizationPermission } from "@/app/utils/auth/rbac"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordAudit } from "@/lib/audit/record-audit"
import nodemailer from "nodemailer"

const lineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().positive(),
})

const createSaleSchema = z.object({
  customerId: z
    .string()
    .optional()
    .transform((s) => (!s?.trim() ? undefined : s.trim())),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  lines: z.array(lineSchema).min(1, "Inclua ao menos um item"),
  status: z.enum(["DRAFT", "CONFIRMED"]).default("CONFIRMED"),
})

export type CreateSaleLineInput = z.infer<typeof lineSchema>
export type CreateSaleInput = z.infer<typeof createSaleSchema>

async function getSalesContext() {
  const session = await auth()
  if (!session?.user?.id) return { error: "Não autorizado" } as const
  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) return { error: "Empresa não identificada" } as const
  const canManageSales = await hasOrganizationPermission({
    session,
    organizationId,
    permission: "sales:manage",
  })
  if (!canManageSales) return { error: "Sem permissão para gerir vendas." } as const
  return { session, organizationId, userId: session.user.id } as const
}

export async function createSale(input: CreateSaleInput) {
  const ctx = await getSalesContext()
  if ("error" in ctx) return { error: ctx.error }
  const { organizationId, userId } = ctx

  const parsed = createSaleSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const { customerId, notes, lines, status } = parsed.data

  try {
    if (customerId) {
      const cust = await prisma.customer.findFirst({
        where: { id: customerId, organizationId },
      })
      if (!cust) {
        return { error: "Cliente não encontrado nesta empresa" }
      }
    }

    const productIds = [...new Set(lines.map((l) => l.productId))]
    const products = await prisma.product.findMany({
      where: {
        organizationId,
        id: { in: productIds },
        active: true,
      },
    })
    if (products.length !== productIds.length) {
      return { error: "Um ou mais produtos são inválidos ou inativos" }
    }

    const totalCents = lines.reduce(
      (sum, l) => sum + l.quantity * l.unitPriceCents,
      0,
    )

    const sale = await prisma.$transaction(async (tx) => {
      const s = await tx.sale.create({
        data: {
          organizationId,
          customerId: customerId || null,
          status,
          totalCents,
          notes,
        },
      })

      for (const line of lines) {
        const lineTotalCents = line.quantity * line.unitPriceCents
        await tx.saleLine.create({
          data: {
            saleId: s.id,
            productId: line.productId,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            lineTotalCents,
          },
        })
      }

      return s
    })

    revalidatePath("/dashboard/vendas")
    await recordAudit({
      organizationId,
      userId,
      category: "SALE",
      action: "sale.create",
      summary: `Venda ${status === "DRAFT" ? "rascunho" : "confirmada"} · ${(totalCents / 100).toFixed(2)}`,
      entityType: "Sale",
      entityId: sale.id,
      metadata: { totalCents, status, lineCount: lines.length },
    })
    return { data: sale }
  } catch (e) {
    console.error(e)
    return { error: "Não foi possível registrar a venda/orçamento" }
  }
}

export async function cancelSale(saleId: string) {
  const ctx = await getSalesContext()
  if ("error" in ctx) return { error: ctx.error }
  const { organizationId } = ctx

  try {
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, organizationId },
    })
    if (!sale) {
      return { error: "Venda não encontrada" }
    }
    if (sale.status === "CANCELLED") {
      return { error: "Venda já cancelada" }
    }

    await prisma.sale.update({
      where: { id: saleId },
      data: { status: "CANCELLED" },
    })
    revalidatePath("/dashboard/vendas")
    await recordAudit({
      organizationId,
      userId: ctx.userId,
      category: "SALE",
      action: "sale.cancel",
      summary: `Venda cancelada · …${saleId.slice(-6)}`,
      entityType: "Sale",
      entityId: saleId,
    })
    return { ok: true as const }
  } catch (e) {
    console.error(e)
    return { error: "Não foi possível cancelar a venda" }
  }
}

export async function confirmSale(saleId: string) {
  const ctx = await getSalesContext()
  if ("error" in ctx) return { error: ctx.error }
  const { organizationId } = ctx

  try {
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, organizationId },
      select: { id: true, status: true },
    })
    if (!sale) {
      return { error: "Orçamento não encontrado" }
    }
    if (sale.status === "CANCELLED") {
      return { error: "Não é possível confirmar uma venda cancelada" }
    }
    if (sale.status === "CONFIRMED") {
      return { error: "Venda já confirmada" }
    }

    await prisma.sale.update({
      where: { id: saleId },
      data: { status: "CONFIRMED" },
    })

    revalidatePath("/dashboard/vendas")
    return { ok: true as const }
  } catch (e) {
    console.error(e)
    return { error: "Não foi possível confirmar o orçamento" }
  }
}

const sendQuoteSchema = z.object({
  customerId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().positive(),
})

export async function sendQuoteByEmail(input: z.infer<typeof sendQuoteSchema>) {
  const ctx = await getSalesContext()
  if ("error" in ctx) return { error: ctx.error }
  const { organizationId } = ctx

  const parsed = sendQuoteSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const customer = await prisma.customer.findFirst({
    where: { id: parsed.data.customerId, organizationId },
    select: { name: true, email: true },
  })
  if (!customer?.email) {
    return { error: "Cliente sem e-mail cadastrado" }
  }

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, organizationId, active: true },
    select: { name: true },
  })
  if (!product) {
    return { error: "Produto inválido para esta empresa" }
  }

  const smtpHost = process.env.SMTP_HOST
  const smtpPort = Number.parseInt(process.env.SMTP_PORT ?? "587", 10)
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const smtpFrom = process.env.SMTP_FROM
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) {
    return { error: "Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM no .env" }
  }

  const totalCents = parsed.data.quantity * parsed.data.unitPriceCents
  const formatBrl = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  })

  const subject = `Orçamento - ${product.name}`
  const text =
    `Olá, ${customer.name}!\n\n` +
    `Segue seu orçamento:\n` +
    `- Produto: ${product.name}\n` +
    `- Quantidade: ${parsed.data.quantity}\n` +
    `- Preço unitário: ${formatBrl(parsed.data.unitPriceCents)}\n` +
    `- Total: ${formatBrl(totalCents)}\n\n` +
    `Se quiser, responda este e-mail para seguirmos com a confirmação.`

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to: customer.email,
      subject,
      text,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
          <p>Olá, <strong>${customer.name}</strong>!</p>
          <p>Segue seu orçamento:</p>
          <ul>
            <li><strong>Produto:</strong> ${product.name}</li>
            <li><strong>Quantidade:</strong> ${parsed.data.quantity}</li>
            <li><strong>Preço unitário:</strong> ${formatBrl(parsed.data.unitPriceCents)}</li>
            <li><strong>Total:</strong> ${formatBrl(totalCents)}</li>
          </ul>
          <p>Se quiser, responda este e-mail para seguirmos com a confirmação.</p>
        </div>
      `,
    })
    return { ok: true as const }
  } catch (e) {
    console.error(e)
    return { error: "Falha ao enviar e-mail de orçamento" }
  }
}
