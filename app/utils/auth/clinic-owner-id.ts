import type { Session } from "next-auth"

/** `userId` dos dados da clínica (agenda, serviços, etc.): sempre o dono. */
export function getClinicOwnerUserId(session: Session | null): string | null {
  if (!session?.user?.id) return null
  return session.user.clinicOwnerId ?? session.user.id
}
