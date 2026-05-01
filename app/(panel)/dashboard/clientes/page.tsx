import getSession from "@/lib/getSession"
import { redirect } from "next/navigation"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import prisma from "@/lib/prisma"
import { ClientesContent } from "./_components/clientes-content"

export default async function ClientesPage() {
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) {
    redirect("/acesso-empresa")
  }

  const customers = await prisma.customer.findMany({
    where: { organizationId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  })

  const salesByCustomer = await prisma.sale.groupBy({
    by: ["customerId"],
    where: {
      organizationId,
      status: "CONFIRMED",
      customerId: { not: null },
    },
    _count: { _all: true },
    _sum: { totalCents: true },
    _max: { createdAt: true },
  })

  const historyMap = new Map(
    salesByCustomer
      .filter((row) => row.customerId)
      .map((row) => [
        row.customerId as string,
        {
          salesCount: row._count._all,
          totalCents: row._sum.totalCents ?? 0,
          lastSaleAt: row._max.createdAt,
        },
      ]),
  )

  const customersWithHistory = customers.map((customer) => ({
    ...customer,
    history: historyMap.get(customer.id) ?? {
      salesCount: 0,
      totalCents: 0,
      lastSaleAt: null,
    },
  }))

  return <ClientesContent customers={customersWithHistory} />
}
