"use server"

import { Subscription } from "@/lib/generated/prisma";
import prisma from "@/lib/prisma";
import { Session } from "next-auth";
import { getPlans } from "./get-plans";
import { PLANS } from "../plans";
import { checkSubscriptionExpired } from "@/app/utils/permissions/checkSubscriptionExpired"
import { ResultPermissionProps } from "./canPermission";

export async function canCreateService(subscription: Subscription | null, session: Session): Promise<ResultPermissionProps>{
     
   try {
      const serviceCount = await prisma.service.count({
        where: {
            userId: session?.user?.id
        }
      })

     if(subscription && subscription.status === "active") {
        const plan = subscription.plan;
        const planLimits = await getPlans(plan)

        console.log("LIMITES DO SEU PLANO:" , planLimits)

        return{
            hasPermission: planLimits.maxServices === null || serviceCount <= planLimits.maxServices,
            planId: subscription.plan,
            expired: false,
            plan: PLANS [subscription.plan],
        }
     }


const checkUserLimit = await checkSubscriptionExpired(session)

return checkUserLimit;


   }catch(err) {
  
    return{
        hasPermission: false,
        planId: "EXPIRED",
        expired: false,
        plan: null,
    }

   }

}