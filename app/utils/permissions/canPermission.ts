"use server"

import { auth } from "@/lib/auth";
import { PlanDetailInfo } from "./get-plans";
import prisma from "@/lib/prisma";
import { canCreateService } from "./canCreateService";
import { Service } from "@/lib/generated/prisma";
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id";


export type PLAN_PROP = "BASIC" | "PROFESSIONAL" | "TRIAL" | "EXPIRED";
type TypeCheck = "service";

export interface ResultPermissionProps {
    hasPermission: boolean;
    planId: PLAN_PROP;
    expired: boolean;
    plan: PlanDetailInfo| null,
}

interface CanPermissionProps {
    type: TypeCheck;
}

export async function canPermission( { type }: CanPermissionProps ): Promise<ResultPermissionProps>{

const session = await auth();

if(!session?.user?.id) {
    return {
        hasPermission: false,
        planId: "EXPIRED",
        expired: true,
        plan: null,
    }
}

const clinicOwnerId = getClinicOwnerUserId(session)
    if (!clinicOwnerId) {
        return {
            hasPermission: false,
            planId: "EXPIRED",
            expired: true,
            plan: null,
        }
    }

const subscription = await prisma.subscription.findFirst({
    where: {
        userId: clinicOwnerId
    }
})

switch(type){
    case "service":

    const permission = await canCreateService(subscription, session)
      
return permission;

        default:
            return{
            hasPermission: false,
            planId: "EXPIRED",
            expired: true,
            plan: null,
   }
 }

}