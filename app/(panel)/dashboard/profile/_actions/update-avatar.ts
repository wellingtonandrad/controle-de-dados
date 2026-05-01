"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function updateProfileAvatar({ avatarUrl }: { avatarUrl: string }) {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: "Sessão inválida." }
  }

  if (!avatarUrl) {
    return { error: "URL da imagem inválida." }
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: avatarUrl },
    })

    revalidatePath("/dashboard/profile")

    return { data: "Foto atualizada." }
  } catch {
    return { error: "Não foi possível atualizar a foto." }
  }
}
