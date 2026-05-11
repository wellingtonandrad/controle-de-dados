import type Stripe from "stripe"
import prisma from "@/lib/prisma"
import { stripe } from "@/app/utils/stripe"
import { manageSubscription } from "@/app/utils/manage-subscription"

/**
 * Após o Checkout, o utilizador volta antes do webhook gravar no DB.
 * Com session_id na URL, sincroniza já a assinatura (idempotente com upsert).
 */
export async function syncSubscriptionFromCheckout(
  checkoutSessionId: string,
  userId: string,
) {
  if (!checkoutSessionId?.trim() || !userId) return

  const user = await prisma.user.findFirst({ where: { id: userId } })
  if (!user?.stripe_customer_id) return

  if (!stripe) return

  const checkoutSession = await stripe.checkout.sessions.retrieve(
    checkoutSessionId.trim(),
    { expand: ["subscription", "customer"] },
  )

  if (checkoutSession.status !== "complete") return

  const customerId = stripeObjectId(checkoutSession.customer)
  if (!customerId || customerId !== user.stripe_customer_id) return

  const subscriptionId = stripeObjectId(checkoutSession.subscription)
  if (!subscriptionId) return

  const type = checkoutSession.metadata?.type ?? "BASIC"

  await manageSubscription(subscriptionId, customerId, true, false, type)
}

function stripeObjectId(
  ref: string | Stripe.Customer | Stripe.DeletedCustomer | Stripe.Subscription | null,
): string | null {
  if (ref == null) return null
  if (typeof ref === "string") return ref
  if (typeof ref === "object" && "id" in ref && typeof ref.id === "string") {
    return ref.id
  }
  return null
}
