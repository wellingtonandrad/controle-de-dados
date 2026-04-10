import getSession from "@/lib/getSession"
import { redirect } from "next/navigation"
import { getUserData } from "./_data-access/get-info-user"
import { ProfileContent } from "./_components/profile"


export default async function Profile() {
  const session = await getSession();

const userId = session?.user?.id
if (!userId) {
    redirect("/")
}

const user = await getUserData({ userId })

  
if (!user) {
    redirect("/");
}

    return <ProfileContent user={user} />
}