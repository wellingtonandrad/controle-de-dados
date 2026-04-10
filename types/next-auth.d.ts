import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    stripe_customer_id?: string | null
    time?: string[]
    address?: string
    phone?: string
    status?: boolean
    createdAt?: string
    updatedAt?: string
    emailVerified?: string | null
  }

  interface Session {
    user: User & DefaultSession["user"]
  }
}
