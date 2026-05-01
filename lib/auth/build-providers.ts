import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"

/** Registra somente GitHub como provider OAuth. */
export function buildAuthProviders(): NextAuthConfig["providers"] {
  const providers: NextAuthConfig["providers"] = []

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

  if (providers.length === 0) {
    console.warn(
      "[auth] GitHub OAuth não configurado. Use PANEL_NO_AUTH=true ou defina AUTH_GITHUB_ID / AUTH_GITHUB_SECRET.",
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
  return false
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
