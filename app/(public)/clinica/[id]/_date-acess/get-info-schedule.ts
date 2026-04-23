"use server"

import prisma from "@/lib/prisma"

export async function getInfoSchedule({userId}: {userId: string}){
   try{
    if(!userId){
        return null;
    }

    const user = await prisma.user.findFirst({
        where:{
            id: userId,
            role: "CLINIC",
            clinicVerified: true,
            status: true,
        },
        include:{
            subscription: true,
            services: {
               where: {
                 status: true
               }
            },
        }
    })

    if(!user){
        return null;
    }

    return user;

   }catch(err){
    console.error(err)
    return null
   }
}