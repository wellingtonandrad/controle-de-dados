import Link from "next/link"
import { Button } from "@/components/ui/button"
import getSession from "@/lib/getSession"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { LegalFooterLinks } from "../_components/legal-footer-links"

export default async function AcessoEmpresaPage() {
  if (process.env.PANEL_NO_AUTH === "true") {
    redirect("/dashboard")
  }

  const session = await getSession()

  if (session?.user?.id) {
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    })

    if (member?.organization?.verified && member.organization.active) {
      redirect("/dashboard")
    }

    const ownedOrg = await prisma.organization.findFirst({
      where: {
        ownerUserId: session.user.id,
        verified: true,
        active: true,
      },
    })

    if (ownedOrg) {
      redirect("/dashboard")
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="container mx-auto px-6 py-20 md:py-24">
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] md:p-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
          Controle ERP
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          Acesso da empresa
        </h1>

        <p className="mt-3 text-slate-600">
          O painel interno e exclusivo para empresas verificadas e membros da
          equipe.
        </p>

        <p className="mt-2 text-slate-600">
          Se voce representa uma empresa e ainda nao tem acesso, fale com o
          administrador para liberar seu e-mail ou concluir a verificacao.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Voltar para inicio</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/#recursos">Recursos</Link>
          </Button>
        </div>

        <div className="mt-10 border-t border-slate-100 pt-6">
          <p className="mb-3 text-center text-xs text-slate-500">
            Ao usar o login da empresa, voce confirma que leu os documentos
            abaixo.
          </p>
          <LegalFooterLinks className="text-slate-600" />
        </div>
        </div>
      </section>
    </main>
  )
}
