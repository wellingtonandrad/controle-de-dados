"use server"

import { Session } from "next-auth";
import { addDays, isAfter } from "date-fns";
import { ResultPermissionProps } from "./canPermission";


const TRAIL_DAYS = 3;

export async function checkSubscriptionExpired(session: Session): Promise<ResultPermissionProps> {
   
   const trailEndDate =  addDays(session?.user?.createdAt!, TRAIL_DAYS)
 
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

