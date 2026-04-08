import { getSubscription } from "@/app/utils/get-subscription"
import { GridPlans } from "@/app/utils/plans/_components/grid-plans"
import getSession from "@/lib/getSession"
import { redirect } from "next/navigation"

export default async function Plans() {
    const session = await getSession()

if (!session) {
    redirect("/")
}

const subscription = await getSubscription({  userId: session?.user?.id! })

console.log(subscription);

    return(
     
            <div>
               {subscription?.status !== "active" && (
                 <GridPlans />
               )}

            {subscription?.status == "active" && (
                
             <h1>Você tem uma assinatura ativa</h1>

            )}

            </div>
      
    )
}