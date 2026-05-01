import "dotenv/config"
import { PrismaClient } from "./generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const connection = `${process.env.DATABASE_URL}`

let prisma: PrismaClient
const adapter = new PrismaPg({ connectionString: connection })

function hasErpDelegates(client: PrismaClient): boolean {
  const c = client as unknown as {
    supplier?: unknown
    purchase?: unknown
    appointmentInstallment?: unknown
    receivable?: unknown
    workCenter?: unknown
    productionOrder?: unknown
    productionMaterialPlan?: unknown
    salesGoal?: unknown
  }
  return Boolean(
    c.supplier &&
      c.purchase &&
      c.appointmentInstallment &&
      c.receivable &&
      c.workCenter &&
      c.productionOrder &&
      c.productionMaterialPlan &&
      c.salesGoal,
  )
}

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({ adapter })
} else {
  const globalWithPrisma = global as typeof globalThis & {
    prisma: PrismaClient | undefined
  }
  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient({ adapter })
  }

  /**
   * Em dev, após alterar o schema, o singleton global pode ficar com client antigo
   * (sem novos delegates). Recria automaticamente.
   */
  if (!hasErpDelegates(globalWithPrisma.prisma)) {
    globalWithPrisma.prisma = new PrismaClient({ adapter })
  }

  prisma = globalWithPrisma.prisma
}

export default prisma;