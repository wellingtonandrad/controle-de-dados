"use server"

import { auth } from "@/lib/auth"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { revalidatePath } from "next/cache"

const formSchema = z.object({
    serviceId: z.string().min(1, "O id do serviço é obrigatório"),
})

type FromSchema = z.infer<typeof formSchema>

export async function deleteService(formData: FromSchema) {
    const session = await auth();

    if (!session?.user?.id) {
        return {
          error: "Falha ao cadastrar serviço",
        }
    }

    const organizationId = getActiveOrganizationId(session)
    if (!organizationId) {
        return { error: "Empresa não identificada" }
    }
   
    const schema = formSchema.safeParse(formData);

    if (!schema.success) {
        return {
            error: schema.error.issues[0].message
        }
    }

    try{
       
        await prisma.service.update({
            where:{
                id: formData.serviceId,
                organizationId,
            },
            data:{
                status: false
            }
        })

        revalidatePath("/dashboard/services")

        return {
            data: "Serviço deletado com sucesso",
        }
        
    }catch(err){
        return {
            error: "Falha ao deletar serviço",
        }
    }

}