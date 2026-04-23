import { Suspense } from "react"
import getSession from "@/lib/getSession"
import { ServicesContent } from "./_components/service-content"
import { redirect } from "next/navigation"
import { getClinicOwnerUserId } from "@/app/utils/auth/clinic-owner-id"


export default async function Services() {
    const session = await getSession()

if (!session){
    redirect("/")
}

    const clinicOwnerId = getClinicOwnerUserId(session)
    if (!clinicOwnerId) {
        redirect("/acesso-clinica")
    }

    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <ServicesContent userId={clinicOwnerId} />
        </Suspense>
    )
}