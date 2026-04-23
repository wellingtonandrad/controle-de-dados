export function normalizeEmail(email?: string | null): string {
  return (email ?? "").trim().toLowerCase()
}

export function getAllowedClinicEmails(): Set<string> {
  const raw = process.env.CLINIC_ALLOWED_EMAILS ?? ""
  const emails = raw
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter(Boolean)

  return new Set(emails)
}

export function isAllowedClinicEmail(email?: string | null): boolean {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return false

  return getAllowedClinicEmails().has(normalizedEmail)
}

export function shouldAutoApproveClinic(email?: string | null): boolean {
  return isAllowedClinicEmail(email)
}
