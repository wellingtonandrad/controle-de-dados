"use server"

import prisma from "@/lib/prisma"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"


const formSchema = z.object({
  appointmentId: z.string().min(1, "Você precisa fornecer um agendamento"),
})


type FormSchema = z.infer<typeof formSchema>

export async function cancelAppointment(formData: FormSchema){

    const schema = formSchema.safeParse(formData)

    if(!schema.success){
        return {
            error: schema.error.issues[0]?.message
        }
    }


    const session = await auth();

    if(!session?.user?.id) {
        return {
            error: "Usuário não encontrado"
        }
    }

    const organizationId = getActiveOrganizationId(session)
    if (!organizationId) {
        return { error: "Empresa não identificada" }
    }

    try {

        await prisma.$transaction(async (tx) => {
          await tx.appointment.update({
            where: {
              id: formData.appointmentId,
              organizationId,
            },
            data: {
              status: "CANCELED",
            },
          })
          await tx.appointmentInstallment.deleteMany({
            where: { appointmentId: formData.appointmentId },
          })
        })

        revalidatePath("/dashboard")
        revalidatePath("/dashboard/reports")

        return {
            data: "Agendamento marcado como cancelado"
        }

    }catch(err) {
        return {
            error: "Ocorreu um erro ao cancelar este agendamento."
        }
    }

}