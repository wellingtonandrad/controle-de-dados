import getSession from "@/lib/getSession"
import { redirect } from "next/navigation"
import { getUserData } from "./_data-access/get-info-user"
import { ProfileContent } from "./_components/profile"
import { ErpPageHeader } from "../_components/erp-page-header"

export default async function Profile() {
  const session = await getSession()

  if (!session?.user?.id) {
    redirect("/")
  }

  const user = await getUserData({ userId: session.user.id })

  if (!user) {
    redirect("/")
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <ErpPageHeader
        title="Configurações"
        description="Ajuste seu nome, contato e foto. Cadastros e operação da empresa ficam nos módulos do menu."
      />
      <ProfileContent user={user} />
    </div>
  )
}