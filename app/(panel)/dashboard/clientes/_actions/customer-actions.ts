"use server"

import { auth } from "@/lib/auth"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const customerFields = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().email("E-mail inválido").optional(),
  ),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  document: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  address: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  city: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  state: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  postalCode: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
})

const createSchema = customerFields

const updateSchema = customerFields.extend({
  id: z.string().min(1),
  active: z.boolean().optional(),
})

export type CreateCustomerInput = z.infer<typeof createSchema>
export type UpdateCustomerInput = z.infer<typeof updateSchema>

export async function createCustomer(input: CreateCustomerInput) {
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

  try {
    const row = await prisma.customer.create({
      data: {
        organizationId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        document: parsed.data.document,
        address: parsed.data.address,
        city: parsed.data.city,
        state: parsed.data.state,
        postalCode: parsed.data.postalCode,
        notes: parsed.data.notes,
      },
    })
    revalidatePath("/dashboard/clientes")
    return { data: row }
  } catch (e) {
    console.error(e)
    return { error: "Não foi possível cadastrar o cliente" }
  }
}

export async function updateCustomer(input: UpdateCustomerInput) {
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
    const existing = await prisma.customer.findFirst({
      where: { id: parsed.data.id, organizationId },
    })
    if (!existing) {
      return { error: "Cliente não encontrado" }
    }

    const row = await prisma.customer.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        document: parsed.data.document,
        address: parsed.data.address,
        city: parsed.data.city,
        state: parsed.data.state,
        postalCode: parsed.data.postalCode,
        notes: parsed.data.notes,
        ...(parsed.data.active !== undefined
          ? { active: parsed.data.active }
          : {}),
      },
    })
    revalidatePath("/dashboard/clientes")
    return { data: row }
  } catch (e) {
    console.error(e)
    return { error: "Não foi possível atualizar o cliente" }
  }
}

export async function setCustomerActive(id: string, active: boolean) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Não autorizado" }
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    return { error: "Empresa não identificada" }
  }

  try {
    const existing = await prisma.customer.findFirst({
      where: { id, organizationId },
    })
    if (!existing) {
      return { error: "Cliente não encontrado" }
    }

    await prisma.customer.update({
      where: { id },
      data: { active },
    })
    revalidatePath("/dashboard/clientes")
    return { ok: true as const }
  } catch (e) {
    console.error(e)
    return { error: "Não foi possível atualizar o status" }
  }
}
