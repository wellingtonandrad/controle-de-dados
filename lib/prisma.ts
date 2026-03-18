import "dotenv/config"
import { PrismaClient } from "./generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const connection = `${process.env.DATABASE_URL}`

let prisma: PrismaClient
const adapter = new PrismaPg({ connectionString: connection })

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({ adapter })
} else {
  const globalWithPrisma = global as typeof globalThis & {
    prisma: PrismaClient | undefined
  }
  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient({ adapter })
  }

  prisma = globalWithPrisma.prisma
}

export default prisma;