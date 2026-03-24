import getSession from "@/lib/getSession"
import { ServicesContent } from "./_components/service-content"
import { redirect } from "next/navigation"

export default async function Services() {
    const session = await getSession()

if (!session){
    redirect("/")
}

    return (
        <ServicesContent userId={session.user?.id!} />
    )
}