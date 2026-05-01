import type { Session } from "next-auth"

/**
 * Relatorios financeiros: apenas owner e equipe operacional (STAFF).
 */
export function canAccessReports(session: Session | null): boolean {
  const role = session?.user?.organizationRole
  return role === "OWNER" || role === "STAFF"
}
