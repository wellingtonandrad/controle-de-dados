"use server"

import { Session } from "next-auth";
import { addDays, isAfter } from "date-fns";
import { ResultPermissionProps } from "./canPermission";
import { TRIAL_DAYS, TRIAL_LIMITS_DISABLED } from "@/app/utils/permissions/trial-limits"
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id"
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
   
   const clinicOwnerId = getClinicOwnerUserId(session) ?? session.user.id
   const ownerRow = await prisma.user.findUnique({
     where: { id: clinicOwnerId },
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

