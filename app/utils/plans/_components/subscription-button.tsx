"use client"

import { Button } from "@/components/ui/button"
import { Plan } from "@/lib/generated/prisma"
import { createSubscription } from "../_actions/create-subscription"
import { toast } from "sonner"

interface SubscriptionButtonProps {
    type: Plan
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