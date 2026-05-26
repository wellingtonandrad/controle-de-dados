export function getAllowedOrganizationEmails(): Set<string> {
  const raw = process.env.ALLOWED_ORGANIZATION_EMAILS ?? process.env.ALLOWED_CLINIC_EMAILS ?? ""
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function isAllowedOrganizationEmail(email?: string | null): boolean {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return false
  return getAllowedOrganizationEmails().has(normalized)
}

export function shouldAutoApproveOrganization(email?: string | null): boolean {
  return isAllowedOrganizationEmail(email)
}
