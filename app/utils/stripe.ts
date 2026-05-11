import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

/**
 * Stripe precisa de `apiKey` para inicializar.
 * No Vercel, durante o build as env podem não estar presentes ainda,
 * então evitamos inicializar no module scope sem chave.
 */
export const stripe: Stripe | null = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2026-03-25.dahlia" })
  : null

