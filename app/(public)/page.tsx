import { Footer } from "./_components/footer"
import { Header } from "./_components/header"
import { Hero } from "./_components/hero"
import {
  hasGithubOAuthCredentials,
  hasGoogleOAuthCredentials,
} from "@/lib/auth/build-providers"

export default function Home() {
  const panelNoAuth = process.env.PANEL_NO_AUTH === "true"
  const googleOAuthConfigured = hasGoogleOAuthCredentials()
  const githubOAuthConfigured = hasGithubOAuthCredentials()

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        panelNoAuth={panelNoAuth}
        googleOAuthConfigured={googleOAuthConfigured}
        githubOAuthConfigured={githubOAuthConfigured}
      />
      <div className="flex-1">
        <Hero />
        <Footer />
      </div>
    </div>
  )
}
