import getSession from "@/lib/getSession"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { InviteStaffForm } from "./_components/invite-staff-form"
import { ErpPageHeader } from "../_components/erp-page-header"
import { erpTableWrap, erpTableHead } from "@/lib/erp-shell"

export default async function EquipePage() {
  const session = await getSession()
  if (!session?.user?.id) {
    redirect("/")
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    redirect("/acesso-empresa")
  }

  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  const isOwner = session.user.organizationRole === "OWNER"

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <ErpPageHeader
        title="Equipe"
        description="Membros usam o painel com os mesmos dados da empresa. Cada pessoa precisa de uma conta (login) antes de ser adicionada."
      />

      {isOwner ? (
        <InviteStaffForm />
      ) : (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          Somente o dono pode convidar ou alterar papéis. Peça ao titular da conta para
          adicionar novos membros.
        </p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Membros ativos
        </h2>
        <div className={erpTableWrap}>
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead className={erpTableHead}>
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3 text-right">Papel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {m.user.name ?? "Sem nome"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.user.email}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                      {m.role === "OWNER" && "Dono"}
                      {m.role === "MANAGER" && "Gestão"}
                      {m.role === "STAFF" && "Equipe operacional"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
