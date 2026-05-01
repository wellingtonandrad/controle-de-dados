"use server"

import { auth } from "@/lib/auth"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { revalidatePath } from "next/cache"

const formSchema = z.object({
  name: z.string().min(1, { message: "O nome do serviço é obrigatório" }),
  price: z.number().min(1, { message: "O preço do serviço é obrigatório" }),
  duration: z.number(),
})

export type CreateServiceInput = z.infer<typeof formSchema>

export async function createNewService(input: CreateServiceInput) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: "Falha ao cadastrar serviço",
    }
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    return { error: "Empresa não identificada" }
  }

  const parsed = formSchema.safeParse(input)

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0].message,
    }
  }

  try {
    const newService = await prisma.service.create({
      data: {
        name: parsed.data.name,
        price: parsed.data.price,
        duration: parsed.data.duration,
        organizationId,
      },
    })

    revalidatePath("/dashboard/services")

    return {
      data: newService,
    }
  } catch (err) {
    console.error(err)
    return {
      error: "Falha ao cadastrar serviço",
    }
  }
}
