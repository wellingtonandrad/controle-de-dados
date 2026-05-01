"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

interface UseProfileFormProps {
  name: string | null
  address: string | null
  phone: string | null
}

const profileSchema = z.object({
  name: z.string().min(1, { message: "Informe seu nome" }),
  address: z.string().optional(),
  phone: z.string().optional(),
})

export type ProfileFormData = z.infer<typeof profileSchema>

export function useProfileForm({ name, address, phone }: UseProfileFormProps) {
  return useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: name || "",
      address: address || "",
      phone: phone || "",
    },
  })
}
