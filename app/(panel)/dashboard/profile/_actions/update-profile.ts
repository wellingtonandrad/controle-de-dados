"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const formSchema = z.object({
  name: z.string().min(1, { message: "O nome é obrigatório" }),
  address: z.string().optional(),
  phone: z.string().optional(),
})

type FormInput = z.infer<typeof formSchema>

export async function updateProfile(formData: FormInput) {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: "Sessão inválida. Entre novamente." }
  }

  const parsed = formSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: "Confira os campos obrigatórios." }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        address: parsed.data.address ?? "",
        phone: parsed.data.phone ?? "",
      },
    })

    revalidatePath("/dashboard/profile")

    return { data: "Dados salvos." }
  } catch (err) {
    console.error(err)
    return { error: "Não foi possível salvar." }
  }
}
