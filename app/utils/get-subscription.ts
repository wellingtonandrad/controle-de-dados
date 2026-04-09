"use server"

import { unstable_noStore as noStore } from "next/cache"
import prisma from "@/lib/prisma"

export async function getSubscription({ userId }: { userId: string}) {
    noStore()
    if (!userId) {
        return null
    }

    try {
       
      const subscription = await prisma.subscription.findFirst({
        where: {
            userId: userId
        }
      })
   
      return subscription; 

    } catch (err) {
        return null;
    }

}
