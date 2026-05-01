import prisma from "@/lib/prisma"

export async function getAllServices({
  organizationId,
}: {
  organizationId: string
}) {

    if (!organizationId){
        return{
            error: "Falha as buscar serviços"
        }
    }
    try{

       const services = await prisma.service.findMany({
        where:{
            organizationId,
            status: true
        }
       })
    
       return {
        data: services
       }

    } catch (err) {
        return {
            error: "Falha ao buscar serviços"
        }
    }
}