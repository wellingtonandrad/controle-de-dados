import { Footer } from "./_components/footer"
import { Header } from "./_components/header"
import { Hero } from "./_components/hero"
import {
  hasGoogleOAuthCredentials,
} from "@/lib/auth/build-providers"

/** Garante que o flag de OAuth reflita o .env no deploy (evita página estática desatualizada). */
export const dynamic = "force-dynamic"

export default function Home() {
  const panelNoAuth = process.env.PANEL_NO_AUTH === "true"
  const googleOAuthConfigured = hasGoogleOAuthCredentials()

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        panelNoAuth={panelNoAuth}
        googleOAuthConfigured={googleOAuthConfigured}
      />
      <div className="flex-1">
        <Hero />
        <Footer />
      </div>
    </div>
  )
}
