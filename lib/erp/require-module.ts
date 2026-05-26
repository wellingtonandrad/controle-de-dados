import { redirect } from "next/navigation"
import type { ErpVerticalModule } from "@/lib/generated/prisma"
import { requireOrganizationUser } from "@/app/utils/auth/require-organization-user"
import { hasErpModule } from "@/lib/erp/vertical-modules"

/** Bloqueia acesso à rota se o módulo vertical não estiver ativo na empresa. */
export async function requireErpModule(module: ErpVerticalModule) {
  const { organization } = await requireOrganizationUser()
  if (!hasErpModule(organization.enabledModules, module)) {
    redirect("/dashboard/overview?modulo=indisponivel")
  }
  return organization
}
