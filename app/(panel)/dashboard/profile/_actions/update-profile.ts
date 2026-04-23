"use server"

import {auth} from "@/lib/auth"
import  prisma  from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id"
import { z } from "zod"

const formSchema = z.object({
    name: z.string().min(1, {message:"O nome é obrigatório"}),
    address: z.string().optional(),
    phone: z.string().optional(),
    status: z.boolean(),
    timeZone: z.string(),
    times: z.array(z.string()),
    
})

type formSchema = z.infer<typeof formSchema>


export async function updateProfile(formData: formSchema){

    const session = await auth();

    if(!session?.user?.id){
        return{
            error: "Usuário não encontrado",
        }
    }

    const clinicOwnerId = getClinicOwnerUserId(session)
    if (!clinicOwnerId) {
        return { error: "Clínica não identificada" }
    }

    const schema = formSchema.safeParse( formData)

    if(!schema.success){
        return{
            error: "Preencha todos os campos"
        }
    }
   
    try{

        await prisma.user.update({
            where:{
                id: clinicOwnerId,
            },
            data:{
                name: formData.name,
                address: formData.address,
                phone: formData.phone,
                status: formData.status,
                timeZone: formData.timeZone,
                times: formData.times || []
            }
        })

        revalidatePath("/dashboard/profile")

        return {
            data: "Clinica atualizada com sucesso!"
        }

    }catch(err){
        console.log(err);
        return{
            error: "Falha ao atualizar clinica",
        }
    }
}