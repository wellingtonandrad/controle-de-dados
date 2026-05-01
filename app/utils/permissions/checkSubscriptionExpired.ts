"use server"

import { Session } from "next-auth";
import { addDays, isAfter } from "date-fns";
import { ResultPermissionProps } from "./canPermission";
import { TRIAL_DAYS, TRIAL_LIMITS_DISABLED } from "@/app/utils/permissions/trial-limits"
import { getBillingUserId } from "@/app/utils/auth/organization-context"
import prisma from "@/lib/prisma"

export async function checkSubscriptionExpired(session: Session): 
Promise<ResultPermissionProps> {

   if (TRIAL_LIMITS_DISABLED) {
     return {
       hasPermission: true,
       planId: "TRIAL",
       expired: false,
       plan: null,
     }
   }
   
   const billingUserId = getBillingUserId(session) ?? session.user.id
   const ownerRow = await prisma.user.findUnique({
     where: { id: billingUserId },
     select: { createdAt: true },
   })
   if (!ownerRow) {
     return {
       hasPermission: false,
       planId: "EXPIRED",
       expired: true,
       plan: null,
     }
   }

   const trailEndDate = addDays(ownerRow.createdAt, TRIAL_DAYS)
 
   if (isAfter(new Date(), trailEndDate)){
    return{
        hasPermission: false,
        planId: "EXPIRED",
        expired: true,
        plan: null,
    }
 }

 return{
    hasPermission: true,
    planId: "TRIAL",
    expired: false,
    plan: null,
 }
}

