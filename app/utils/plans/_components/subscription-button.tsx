"use client"

import { Button } from "@/components/ui/button"
import type { PlansProps } from "@/app/utils/plans/index"
import { createSubscription } from "../_actions/create-subscription"

type PlanTier = keyof PlansProps
import { toast } from "sonner"

interface SubscriptionButtonProps {
  type: PlanTier
}


export function SubscriptionButton({ type }: SubscriptionButtonProps) {

    async function handleCreateBilling() {

        const { error, url } = await createSubscription({ type })

        if (error) {
            toast.error(error)
            return
        }

        // Checkout hospedado: basta a url; loadStripe não é obrigatório para redirecionar
        if (url) {
            window.location.href = url
        }

    }




    return (
        <Button 
        className={`w-full  ${type === "PROFESSIONAL" && "bg-emerald-500 hover:bg-emerald-400"}
        `}
        onClick={handleCreateBilling}
        >
            Ativar assinatura
        </Button>
    )
}