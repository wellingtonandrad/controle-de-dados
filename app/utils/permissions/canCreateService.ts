"use server"

import { Session } from "next-auth"
import { checkSubscriptionExpired } from "@/app/utils/permissions/checkSubscriptionExpired"
import { ResultPermissionProps } from "./canPermission"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"

export async function canCreateService(
  session: Session,
): Promise<ResultPermissionProps> {
  try {
    const organizationId = getActiveOrganizationId(session)
    if (!organizationId) {
      return {
        hasPermission: false,
        planId: "EXPIRED",
        expired: true,
        plan: null,
      }
    }

    return await checkSubscriptionExpired(session)
  } catch {
    return {
      hasPermission: false,
      planId: "EXPIRED",
      expired: false,
      plan: null,
    }
  }
}
