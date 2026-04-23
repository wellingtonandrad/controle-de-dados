import { promises as dns } from "node:dns"

/** Domínios comuns de e-mail descartável / temporário (lista enxuta; amplie se precisar). */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.org",
  "guerrillamail.net",
  "guerrillamail.biz",
  "sharklasers.com",
  "yopmail.com",
  "yopmail.fr",
  "tempmail.com",
  "temp-mail.org",
  "tempmail.net",
  "throwaway.email",
  "maildrop.cc",
  "getnada.com",
  "trashmail.com",
  "10minutemail.com",
  "10minutemail.net",
  "fakeinbox.com",
  "mailnesia.com",
  "emailondeck.com",
  "moakt.com",
  "mintemail.com",
  "mytemp.email",
  "dispostable.com",
  "discard.email",
  "spam4.me",
  "trashmail.de",
  "emailfake.com",
  "crazymailing.com",
  "tempr.email",
  "tmpmail.org",
  "tmpmail.net",
  "inboxkitten.com",
  "burnermail.io",
])

const DNS_LOOKUP_MS = 5_000

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<
  { kind: "ok"; value: T } | { kind: "timeout" } | { kind: "reject" }
> {
  return new Promise((resolve) => {
    const id = setTimeout(() => resolve({ kind: "timeout" }), ms)
    promise
      .then((value) => {
        clearTimeout(id)
        resolve({ kind: "ok", value })
      })
      .catch(() => {
        clearTimeout(id)
        resolve({ kind: "reject" })
      })
  })
}

function isDisposableDomain(domain: string): boolean {
  const d = domain.toLowerCase()
  if (DISPOSABLE_EMAIL_DOMAINS.has(d)) return true
  for (const dis of DISPOSABLE_EMAIL_DOMAINS) {
    if (d === dis || d.endsWith(`.${dis}`)) return true
  }
  return false
}

function extractDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf("@")
  if (at < 1 || at === trimmed.length - 1) return null
  const domain = trimmed.slice(at + 1)
  if (!domain || domain.includes(" ") || domain.includes("@")) return null
  return domain
}

/**
 * Verifica se o domínio do e-mail parece capaz de receber correio (MX ou A/AAAA),
 * e rejeita domínios descartáveis conhecidos.
 */
export async function validateAppointmentEmail(
  email: string,
): Promise<{ ok: true; normalized: string } | { ok: false; message: string }> {
  const trimmed = email.trim().toLowerCase()
  const domain = extractDomain(trimmed)
  if (!domain) {
    return { ok: false, message: "Digite um e-mail válido." }
  }

  if (isDisposableDomain(domain)) {
    return {
      ok: false,
      message:
        "Não aceitamos e-mail temporário. Use um e-mail pessoal ou corporativo que você acessa.",
    }
  }

  const mxWrapped = await withTimeout(dns.resolveMx(domain), DNS_LOOKUP_MS)
  if (mxWrapped.kind === "timeout") {
    return {
      ok: false,
      message:
        "Não foi possível confirmar o e-mail agora. Tente de novo em instantes.",
    }
  }
  if (mxWrapped.kind === "ok" && mxWrapped.value.length > 0) {
    return { ok: true, normalized: trimmed }
  }

  const a4Wrapped = await withTimeout(dns.resolve4(domain), DNS_LOOKUP_MS)
  if (a4Wrapped.kind === "timeout") {
    return {
      ok: false,
      message:
        "Não foi possível confirmar o e-mail agora. Tente de novo em instantes.",
    }
  }
  if (a4Wrapped.kind === "ok" && a4Wrapped.value.length > 0) {
    return { ok: true, normalized: trimmed }
  }

  const a6Wrapped = await withTimeout(dns.resolve6(domain), DNS_LOOKUP_MS)
  if (a6Wrapped.kind === "timeout") {
    return {
      ok: false,
      message:
        "Não foi possível confirmar o e-mail agora. Tente de novo em instantes.",
    }
  }
  if (a6Wrapped.kind === "ok" && a6Wrapped.value.length > 0) {
    return { ok: true, normalized: trimmed }
  }

  return {
    ok: false,
    message:
      "Este e-mail parece inválido ou o domínio não recebe mensagens. Use um e-mail real (ex.: Gmail, Outlook ou o da sua empresa).",
  }
}
