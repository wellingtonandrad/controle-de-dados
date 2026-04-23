import Link from "next/link"
import { Button } from "@/components/ui/button"
import getSession from "@/lib/getSession"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { LegalFooterLinks } from "../_components/legal-footer-links"

export default async function AcessoClinicaPage() {
  const session = await getSession()

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, clinicVerified: true },
    })

    if (user?.role === "CLINIC" && user.clinicVerified) {
      redirect("/dashboard")
    }

    const membership = await prisma.clinicMember.findFirst({
      where: { userId: session.user.id },
    })

    if (membership) {
      const owner = await prisma.user.findUnique({
        where: { id: membership.clinicOwnerId },
        select: { role: true, clinicVerified: true, status: true },
      })

      if (
        owner?.role === "CLINIC" &&
        owner.clinicVerified &&
        owner.status
      ) {
        redirect("/dashboard")
      }
    }
  }

  return (
    <main className="container mx-auto px-6 py-24">
      <section className="mx-auto max-w-2xl rounded-lg border p-6 md:p-8">
        <h1 className="text-2xl font-bold text-zinc-900 md:text-3xl">
          Acesso para clinicas
        </h1>

        <p className="mt-3 text-zinc-600">
          O painel interno e exclusivo para clinicas aprovadas. Pacientes podem
          usar o agendamento publico sem login.
        </p>

        <p className="mt-2 text-zinc-600">
          Se voce e uma clinica, fale com o administrador para liberar seu
          e-mail no sistema.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Voltar para inicio</Link>
          </Button>
          <Button asChild variant="outline">
            <a href="/#profissionais">Agendar consulta</a>
          </Button>
        </div>

        <div className="mt-10 border-t pt-6">
          <p className="mb-3 text-center text-xs text-zinc-500">
            Ao usar o login da clínica, você confirma que leu os documentos
            abaixo.
          </p>
          <LegalFooterLinks className="text-zinc-600" />
        </div>
      </section>
    </main>
  )
}
