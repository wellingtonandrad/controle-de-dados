"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { revalidatePath } from "next/cache"

const formSchema = z.object({
    serviceId: z.string().min(1, "O id do serviço é obrigatório"),
})

type FromSchema = z.infer<typeof formSchema>

export function deleteService(formData: FromSchema) {
    
}