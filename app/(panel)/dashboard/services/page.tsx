import { Suspense } from "react"
import getSession from "@/lib/getSession"
import { ServicesContent } from "./_components/service-content"
import { redirect } from "next/navigation"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import { ErpPageHeader } from "../_components/erp-page-header"

export default async function Services() {
    const session = await getSession()

if (!session){
    redirect("/")
}

    const organizationId = getActiveOrganizationId(session)
    if (!organizationId) {
        redirect("/acesso-empresa")
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8">
            <ErpPageHeader
                title="Serviços"
                description="Catálogo de serviços da organização (legado / agenda). Use o menu principal para vendas e estoque ERP."
            />
            <Suspense fallback={<div className="text-sm text-slate-500">Carregando…</div>}>
                <ServicesContent organizationId={organizationId} />
            </Suspense>
        </div>
    )
}