"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { stripe } from "@/app/utils/stripe"
import { Plan } from "@/lib/generated/prisma"


interface SubscriptionProps {
    type: Plan;
}

/** Checkout exige `price_...`; no .env pode estar `prod_...` (usa o preço padrão do produto). */
async function resolveStripePriceId(raw: string | undefined): Promise<string> {
    const id = raw?.trim()
    if (!id) throw new Error("STRIPE_PLAN_BASIC / STRIPE_PLAN_PROFESSIONAL ausente")
    if (id.startsWith("price_")) return id
    if (id.startsWith("prod_")) {
        const product = await stripe.products.retrieve(id, { expand: ["default_price"] })
        const dp = product.default_price
        if (typeof dp === "string") return dp
        if (dp && typeof dp === "object" && "id" in dp) return (dp as { id: string }).id
        const prices = await stripe.prices.list({ product: id, active: true, limit: 1 })
        const first = prices.data[0]
        if (first) return first.id
        throw new Error(`Produto Stripe ${id} sem preço ativo`)
    }
    return id
}

export async function createSubscription({ type }: SubscriptionProps){

    const session = await auth();

    const userId = session?.user?.id;

    if(!userId){
        return {
            sessionId: "",
        error: "Falha ao ativar plano."
        }
    }

    const findUser = await prisma.user.findFirst({
        where: {
            id: userId
        }
    })

    if(!findUser){
        return {
            sessionId: "",
            error: "Falha ao ativar plano."
        }
    }

    let customerId = findUser.stripe_customer_id;

    if(!customerId) {

        const stripeCustomer = await stripe.customers.create({
            email: findUser.email
        })

        await prisma.user.update({
            where:{
                id: userId,
            },
            data: {
                stripe_customer_id: stripeCustomer.id
            }
        })

        customerId = stripeCustomer.id;
    }

    try{

        const priceId = await resolveStripePriceId(
            type === "BASIC" ? process.env.STRIPE_PLAN_BASIC : process.env.STRIPE_PLAN_PROFESSIONAL,
        )

        const successUrl =
            process.env.STRIPE_SUCCESS_URL ?? process.env.STRIPE_SUCESS_URL

     const stripeCheckoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        billing_address_collection: "required",
        line_items: [
            {
                price: priceId,
                quantity: 1,
            }
        ],
          metadata: {
            type: type
          },

        mode: "subscription",
        allow_promotion_codes: true,
        success_url: successUrl,
        cancel_url: process.env.STRIPE_CANCEL_URL, 
     })
     
     return {
        sessionId: stripeCheckoutSession.id,
        url: stripeCheckoutSession.url
     }

    }catch(err){
    
     
      return {
        sessionId:"",
        error: "Falha ao ativar plano."
      }

    }

}