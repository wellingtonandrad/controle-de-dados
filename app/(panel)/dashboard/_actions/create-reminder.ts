"use server"

import prisma from "@/lib/prisma"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id"


const formSchema = z.object({
  description: z.string().min(1, "A descrição do lembrete é obrigatória"),
})


type FormSchema = z.infer<typeof formSchema>

export async function createReminder(formData: FormSchema) {

    const session = await auth();

    if(!session?.user?.id){
        return{
            error:"Falha ao cadastrar lembrete"
        }
    }

    const clinicOwnerId = getClinicOwnerUserId(session)
    if (!clinicOwnerId) {
        return { error: "Clínica não identificada" }
    }

    const schema = formSchema.safeParse(formData)

    if(!schema.success){
        return{
            error: schema.error.issues[0].message
        }
    }

    try{

        await prisma.reminder.create({
            data:{
                description:formData.description,
                userId: clinicOwnerId
            }
        })

        revalidatePath("/dashboard")

        return{
            data: "Lembrete cadastrado com sucesso!"
        }

    }catch(err){
        return{
            error:"Falha ao cadastrar lembrete"
        }
    }
}