import { NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/app/utils/stripe"
import { manageSubscription } from "@/app/utils/manage-subscription"
import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_SECRET_WEBHOOK_KEY
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    )
  }

  let event: Stripe.Event
  try {
    const text = await request.text()
    event = stripe.webhooks.constructEvent(text, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await manageSubscription(
          subscription.id,
          subscription.customer.toString(),
          false,
          true,
        )
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await manageSubscription(
          subscription.id,
          subscription.customer.toString(),
          false,
        )
        revalidatePath("/dashboard", "layout")
        break
      }

      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session
        const type = checkoutSession.metadata?.type ?? "BASIC"

        if (type === "appointment_installment") {
          const installmentId = checkoutSession.metadata?.installmentId
          if (installmentId) {
            await prisma.appointmentInstallment.updateMany({
              where: { id: installmentId, paidAt: null },
              data: { paidAt: new Date() },
            })
            revalidatePath("/dashboard", "layout")
            revalidatePath("/dashboard/reports", "page")
          }
          break
        }

        if (checkoutSession.subscription && checkoutSession.customer) {
          await manageSubscription(
            checkoutSession.subscription.toString(),
            checkoutSession.customer.toString(),
            true,
            false,
            type,
          )
        }

        revalidatePath("/dashboard", "layout")
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error("[stripe webhook]", err)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
