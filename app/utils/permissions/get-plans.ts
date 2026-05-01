"use server"

import type { PlansProps } from "@/app/utils/plans/index"

export type PlanTier = keyof PlansProps

export interface PlanDetailInfo{
    maxServices: number;
}

const PLANS_LIMITS: PlansProps = {
    BASIC: {
        maxServices: 3,
    },
    PROFESSIONAL: {
        maxServices: 50
    }
}

export async function getPlans(planId: PlanTier) {
  return PLANS_LIMITS[planId]
}