"use client"

import { ProfileFormData, useProfileForm } from "./profile-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Prisma } from "@/lib/generated/prisma"
import { updateProfile } from "../_actions/update-profile"
import { toast } from "sonner"
import { formatPhone } from "@/app/utils/formatPhone"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AvatarProfile } from "./profile-avatar"

type UserRow = Prisma.UserGetPayload<object>

interface ProfileContentProps {
  user: UserRow
}

export function ProfileContent({ user }: ProfileContentProps) {
  const router = useRouter()
  const { update } = useSession()

  const form = useProfileForm({
    name: user?.name ?? null,
    address: user?.address ?? null,
    phone: user?.phone ?? null,
  })

  async function onSubmit(values: ProfileFormData) {
    const response = await updateProfile({
      name: values.name,
      address: values.address,
      phone: values.phone,
    })

    if (response.error) {
      toast.error(response.error)
      return
    }

    toast.success(response.data)
    await update()
  }

  async function handleLogout() {
    await signOut()
    await update()
    router.replace("/")
  }

  return (
    <div className="mx-auto max-w-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seus dados</CardTitle>
              <p className="text-sm text-muted-foreground">
                Informações do seu usuário no painel. A empresa é gerenciada em{" "}
                <strong className="font-medium text-foreground">Clientes</strong>,{" "}
                <strong className="font-medium text-foreground">Produtos</strong>,{" "}
                <strong className="font-medium text-foreground">Vendas</strong> e{" "}
                <strong className="font-medium text-foreground">Equipe</strong>.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <AvatarProfile avatarUrl={user.image} userId={user.id} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none">E-mail (login)</label>
                <Input value={user.email} readOnly disabled className="bg-slate-50" />
                <p className="text-xs text-muted-foreground">Definido pelo provedor de login (Google).</p>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome de exibição</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Como aparece no painel" autoComplete="name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="(00) 00000-0000"
                          autoComplete="tel"
                          onChange={(e) => {
                            field.onChange(formatPhone(e.target.value))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço (opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Para correspondência ou NF, se aplicável" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full">
                  Salvar alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      <section className="mt-6">
        <Button variant="outline" onClick={() => void handleLogout()}>
          Sair da conta
        </Button>
      </section>
    </div>
  )
}
