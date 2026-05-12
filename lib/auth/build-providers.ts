import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"

/**
 * Um único provedor social por vez: **Google tem prioridade**.
 * Se `AUTH_GOOGLE_*` existir, só Google é registrado (GitHub é ignorado).
 * Caso contrário, usa GitHub se `AUTH_GITHUB_*` estiver definido.
 */
export function buildAuthProviders(): NextAuthConfig["providers"] {
  const providers: NextAuthConfig["providers"] = []

  const googleId = (
    process.env.AUTH_GOOGLE_ID ??
    process.env.GOOGLE_CLIENT_ID ??
    ""
  ).trim()
  const googleSecret = (
    process.env.AUTH_GOOGLE_SECRET ??
    process.env.GOOGLE_CLIENT_SECRET ??
    ""
  ).trim()

  if (googleId && googleSecret) {
    providers.push(
      Google({
        clientId: googleId,
        clientSecret: googleSecret,
      }),
    )
  } else {
    const githubId = (
      process.env.AUTH_GITHUB_ID ??
      process.env.GITHUB_ID ??
      ""
    ).trim()
    const githubSecret = (
      process.env.AUTH_GITHUB_SECRET ??
      process.env.GITHUB_SECRET ??
      ""
    ).trim()

    if (githubId && githubSecret) {
      providers.push(
        GitHub({
          clientId: githubId,
          clientSecret: githubSecret,
        }),
      )
    }
  }

  if (providers.length === 0) {
    console.warn(
      "[auth] Nenhum OAuth configurado. Use PANEL_NO_AUTH=true ou defina Google (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET), ou GitHub (AUTH_GITHUB_ID / AUTH_GITHUB_SECRET) se não usar Google.",
    )
    providers.push(
      Credentials({
        id: "oauth-not-configured",
        name: "oauth-not-configured",
        credentials: {},
        authorize: async () => null,
      }),
    )
  }

  return providers
}

export function hasGoogleOAuthCredentials(): boolean {
  const googleId = (
    process.env.AUTH_GOOGLE_ID ??
    process.env.GOOGLE_CLIENT_ID ??
    ""
  ).trim()
  const googleSecret = (
    process.env.AUTH_GOOGLE_SECRET ??
    process.env.GOOGLE_CLIENT_SECRET ??
    ""
  ).trim()
  return Boolean(googleId && googleSecret)
}

export function hasGithubOAuthCredentials(): boolean {
  const githubId = (
    process.env.AUTH_GITHUB_ID ??
    process.env.GITHUB_ID ??
    ""
  ).trim()
  const githubSecret = (
    process.env.AUTH_GITHUB_SECRET ??
    process.env.GITHUB_SECRET ??
    ""
  ).trim()
  return Boolean(githubId && githubSecret)
}
