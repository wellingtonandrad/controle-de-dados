import type { DefaultSession } from "next-auth"

type AppUserRole = "PATIENT" | "CLINIC"
declare module "next-auth" {
  interface User {
    id: string
    role?: AppUserRole
    clinicVerified?: boolean
    /** Conta dona dos dados (agenda/serviços). Para dono = próprio id. */
    clinicOwnerId?: string | null
    /** Papel na equipe da clínica (recepção ou doutor(a)). */
    clinicStaffRole?: "OWNER" | "RECEPTION" | "DENTIST" | null
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
