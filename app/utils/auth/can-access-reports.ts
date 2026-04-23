import type { Session } from "next-auth"

/**
 * Relatórios financeiros: apenas dono da clínica e dentistas da equipe.
 * Recepção não acessa.
 */
export function canAccessReports(session: Session | null): boolean {
  const role = session?.user?.clinicStaffRole
  return role === "OWNER" || role === "DENTIST"
}
