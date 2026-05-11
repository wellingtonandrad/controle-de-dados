import type { Session } from "next-auth"
import { hasOrganizationPermission } from "./rbac"

/**
 * Relatorios financeiros: apenas owner e equipe operacional (STAFF).
 */
export async function canAccessReports(session: Session | null): Promise<boolean> {
  return hasOrganizationPermission({ session, permission: "reports:view" })
}
