"use client"

import { Button } from "@/components/ui/button"
import { LinkIcon } from "lucide-react"
import { toast } from "sonner"


export function ButtonCopyLink({ organizationId }: { organizationId: string }) {
   
  async function handleCopyLink() {
        await navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_URL}/empresa/${organizationId}`)

        toast("Link de agendamento copiado com sucesso!")
    }

   return(
    <Button onClick={handleCopyLink}>
       <LinkIcon className="w-4 h-4" />
    </Button>   
   )
}