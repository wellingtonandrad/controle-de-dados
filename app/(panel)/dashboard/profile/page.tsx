import getSession from "@/lib/getSession"
import { redirect } from "next/navigation"
import { getUserData } from "./_data-access/get-info-user"
import { ProfileContent } from "./_components/profile"
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id"


export default async function Profile() {
  const session = await getSession();

if (!session?.user?.id) {
    redirect("/")
}

const clinicOwnerId = getClinicOwnerUserId(session)
if (!clinicOwnerId) {
    redirect("/acesso-clinica")
}

const user = await getUserData({ userId: clinicOwnerId })

  
if (!user) {
    redirect("/");
}

    return <ProfileContent user={user} />
}