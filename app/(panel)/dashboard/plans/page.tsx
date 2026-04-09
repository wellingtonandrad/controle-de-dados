import { getSubscription } from "@/app/utils/get-subscription"
import { GridPlans } from "@/app/utils/plans/_components/grid-plans"
import { SubscriptionDetail } from "@/app/utils/plans/_components/subscription-detail"
import { syncSubscriptionFromCheckout } from "@/app/utils/sync-subscription-from-checkout"
import getSession from "@/lib/getSession"
import { redirect } from "next/navigation"

function hasPaidSubscription(status: string | undefined) {
    return status === "active" || status === "trialing"
}

type PageProps = {
    searchParams: Promise<{ session_id?: string }>
}

export const dynamic = "force-dynamic"

export default async function Plans({ searchParams }: PageProps) {
    const session = await getSession()

    if (!session?.user?.id) {
        redirect("/")
    }

    const userId = session.user.id
    const { session_id: checkoutSessionId } = await searchParams

    if (checkoutSessionId) {
        await syncSubscriptionFromCheckout(checkoutSessionId, userId)
    }

    const subscription = await getSubscription({ userId })

    const showActive = hasPaidSubscription(subscription?.status)

    return (
        <div>
            {!showActive && <GridPlans />}

            {showActive && subscription && (
                <SubscriptionDetail subscription={subscription} />
            )}
        </div>
    )
}