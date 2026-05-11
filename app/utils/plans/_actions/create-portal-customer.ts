"use server"

import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { stripe } from "@/app/utils/stripe"

export async function createPortalCustomer() {
    const session = await auth();

    if(!session?.user?.id) {
        return {
            sessionId: "",
            error: "Usuário não encontrado"
        }
    }

    const user = await prisma.user.findFirst({
        where: {
            id: session?.user?.id
        }
    })

    if(!user) {
        return {
            sessionId: "",
            error: "Usuário não encontrado"
        }
    }

    const sessionId = user.stripe_customer_id;

    if(!sessionId) {
        return {
        sessionId: "",
        error: "Usuário não encontrado"
        }
    }

    if (!stripe) {
        return {
            sessionId: "",
            error: "Stripe não configurado (STRIPE_SECRET_KEY ausente)."
        }
    }

    try{

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: sessionId,
            return_url: process.env.STRIPE_SUCESSS_URL as string
        })
    
        return {
            sessionId: portalSession.url
        }

    }catch(err){
      console.log("ERRO AO CRIAR SESSÃO DE PORTAL:", err)
      return {
        sessionId: "",
        error: "Usuário não encontrado"
      }
    }
}