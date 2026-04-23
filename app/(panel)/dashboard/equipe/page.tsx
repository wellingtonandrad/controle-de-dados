import getSession from "@/lib/getSession"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id"
import { InviteStaffForm } from "./_components/invite-staff-form"

export default async function EquipePage() {
  const session = await getSession()
  if (!session?.user?.id) {
    redirect("/")
  }

  const clinicOwnerId = getClinicOwnerUserId(session)
  if (!clinicOwnerId) {
    redirect("/acesso-clinica")
  }

  const members = await prisma.clinicMember.findMany({
    where: { clinicOwnerId },
    include: {
      staffUser: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  const isOwner = session.user.clinicStaffRole === "OWNER"

  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Equipe da clínica</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Recepção e doutores(as) podem usar o painel com a mesma agenda e serviços
          da clínica. Cada pessoa precisa ter uma conta (login) no site antes de
          ser adicionada aqui.
        </p>
      </div>

      {isOwner ? (
        <InviteStaffForm />
      ) : (
        <p className="rounded-md border bg-zinc-50 p-3 text-sm text-zinc-700">
          Somente o dono pode convidar ou alterar papéis. Peça ao dono da clínica
          para adicionar novos membros.
        </p>
      )}

      <section className="rounded-lg border">
        <h2 className="border-b px-4 py-3 text-lg font-medium">Membros</h2>
        <ul className="divide-y">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="font-medium">{m.staffUser.name ?? "Sem nome"}</p>
                <p className="text-sm text-zinc-600">{m.staffUser.email}</p>
              </div>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800">
                {m.role === "OWNER" && "Dono"}
                {m.role === "RECEPTION" && "Recepção"}
                {m.role === "DENTIST" && "Doutor(a)"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
