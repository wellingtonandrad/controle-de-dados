import { loadStripe } from "@stripe/stripe-js"

export async function getStripeJs() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY?.trim()
  if (!key) return null
  return loadStripe(key)
}

