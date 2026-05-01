import getSession from "@/lib/getSession"
import { redirect } from "next/navigation"
import {
  getActiveOrganizationId,
} from "@/app/utils/auth/organization-context"

export default async function Dashboard() {
    const session = await getSession()

    if (!session){
        redirect("/")
    }

    const organizationId = getActiveOrganizationId(session)
    if (!organizationId) {
        redirect("/acesso-empresa")
    }

    redirect("/dashboard/overview")
}