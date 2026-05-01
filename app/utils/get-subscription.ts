"use server"

import { unstable_noStore as noStore } from "next/cache"

/** Assinatura por plano não existe mais no banco; mantém a API para chamadas legadas. */
export async function getSubscription(_args: { userId: string }) {
  noStore()
  return null
}
