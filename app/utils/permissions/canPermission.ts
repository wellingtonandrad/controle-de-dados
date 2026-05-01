"use server"

import { auth } from "@/lib/auth";
import { PlanDetailInfo } from "./get-plans";
import { canCreateService } from "./canCreateService";
import { getBillingUserId } from "@/app/utils/auth/organization-context";


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

const billingUserId = getBillingUserId(session)
    if (!billingUserId) {
        return {
            hasPermission: false,
            planId: "EXPIRED",
            expired: true,
            plan: null,
        }
    }

switch(type){
    case "service":

    const permission = await canCreateService(session)
      
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