import type { Session } from "next-auth"

/** Organização ativa no painel (dados de agenda, serviços, estoque, clientes ERP). */
export function getActiveOrganizationId(session: Session | null): string | null {
  return session?.user?.activeOrganizationId ?? null
}

/** Usuário titular da assinatura / fatura (Stripe) e perfil “da empresa”. */
export function getBillingUserId(session: Session | null): string | null {
  return session?.user?.billingUserId ?? null
}
