import { Suspense } from "react"
import { Footer } from "./_components/footer"
import { Header } from "./_components/header"
import { Hero } from "./_components/hero"
import { Professionals } from "./_components/professionals"
import { ProfessionalsSkeleton } from "./_components/professionals-skeleton"
import { getProfessionals } from "./_data-access/get-professionals"

export const revalidate = 120

async function ProfessionalsSection() {
  const professionals = await getProfessionals()
  return <Professionals professionals={professionals ?? []} />
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div>
        <Hero />

        <Suspense fallback={<ProfessionalsSkeleton />}>
          <ProfessionalsSection />
        </Suspense>

        <Footer />
      </div>
    </div>
  )
}

