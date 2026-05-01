"use server"

import prisma from "@/lib/prisma"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"

const formSchema = z.object({
  reminderId: z.string().min(1, "O id do lembrete é obrigatório"),
})

type FormSchema = z.infer<typeof formSchema>

export async function deleteReminder(formData: FormSchema) {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: "Sessão inválida" }
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    return { error: "Empresa não identificada" }
  }

  const schema = formSchema.safeParse(formData)

  if (!schema.success) {
    return {
      error: schema.error.issues[0].message,
    }
  }

  try {
    const deleted = await prisma.reminder.deleteMany({
      where: {
        id: schema.data.reminderId,
        organizationId,
      },
    })

    if (deleted.count === 0) {
      return { error: "Lembrete não encontrado" }
    }

    revalidatePath("/dashboard")

    return {
      data: "Lembrete deletado com sucesso",
    }
  } catch {
    return {
      error: "Não foi possível deletar o lembrete",
    }
  }
}