import { Prisma } from "@/lib/generated/prisma"
import { ProfessionalsClient } from "./professionals-client"

type UserWithSubscription = Prisma.UserGetPayload<{
  include: {
    subscription: true
  }
}>

interface ProfessionalsProps {
  professionals: UserWithSubscription[]
}

export function Professionals({ professionals }: ProfessionalsProps) {
  return <ProfessionalsClient professionals={professionals} />
}
