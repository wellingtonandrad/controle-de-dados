import type { DefaultSession } from "next-auth"

type AppUserRole = "EXTERNAL" | "ACCOUNT_HOLDER"

type OrganizationMemberRole = "OWNER" | "MANAGER" | "STAFF"

declare module "next-auth" {
  interface User {
    id: string
    role?: AppUserRole
    /** Organização ativa no painel. */
    activeOrganizationId?: string | null
    /** Papel do usuário na organização ativa. */
    organizationRole?: OrganizationMemberRole | null
    /** Organização aprovada para operar. */
    organizationVerified?: boolean
    /** Titular da assinatura / fatura (Stripe). */
    billingUserId?: string | null
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
