"use client"
import { useMemo, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Prisma } from "@/lib/generated/prisma"
import { updateProfile } from "../_actions/update-profile"
import { toast } from "sonner"
import { formatPhone } from "@/app/utils/formatPhone"
import { signOut, useSession} from "next-auth/react"
import { useRouter } from "next/navigation"
import { AvatarProfile } from "./profile-avatar"

type UserWithSubscription = Prisma.UserGetPayload<{
  include: {
    subscription: true
  }
}>

interface ProfileContentProps {
  user: UserWithSubscription
}

function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let i = 8; i <= 24; i++) {
    for (let j = 0; j < 2; j++) {
      const hour = i.toString().padStart(2, "0")
      const minute = (j * 30).toString().padStart(2, "0")
      slots.push(`${hour}:${minute}`)
    }
  }
  return slots
}

const HOURS_GRID = generateTimeSlots()

function sortHoursList(list: string[]) {
  return [...list].sort((a, b) => HOURS_GRID.indexOf(a) - HOURS_GRID.indexOf(b))
}

const HOUR_PRESETS: { label: string; start: string; end: string }[] = [
  { label: "Manhã 08–12h", start: "08:00", end: "12:00" },
  { label: "Comercial 08–18h", start: "08:00", end: "18:00" },
  { label: "Estendido 08–22h", start: "08:00", end: "22:30" },
  { label: "Grade completa", start: "08:00", end: "24:30" },
]

function sliceHoursInclusive(start: string, end: string): string[] {
  const a = HOURS_GRID.indexOf(start)
  const b = HOURS_GRID.indexOf(end)
  if (a < 0 || b < 0) return []
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return HOURS_GRID.slice(lo, hi + 1)
}

export function ProfileContent({ user }: ProfileContentProps) {
  const router = useRouter()
  const { update } = useSession()
  const [selectedHours, setSelectedHours] = useState<string[]>(() =>
    sortHoursList(user.times ?? []),
  )
  const [dialogIsOpen, setDialogIsOpen] = useState(false)
  const [rangeStart, setRangeStart] = useState("08:00")
  const [rangeEnd, setRangeEnd] = useState("18:00")

  const hours = useMemo(() => HOURS_GRID, [])

  const form = useProfileForm({
    name: user?.name ?? null,
    address: user?.address ?? null,
    phone: user?.phone ?? null,
    status: user?.status ?? true,
    timeZone: user?.timeZone ?? null,
  })

  function toggleHour(hour: string) {
    setSelectedHours((prev) =>
      sortHoursList(
        prev.includes(hour) ? prev.filter((h) => h !== hour) : [...prev, hour],
      ),
    )
  }

  function applyPreset(start: string, end: string) {
    setSelectedHours(sortHoursList(sliceHoursInclusive(start, end)))
    setRangeStart(start)
    setRangeEnd(end)
  }

  function applyCustomRange(replace: boolean) {
    const slice = sliceHoursInclusive(rangeStart, rangeEnd)
    if (!slice.length) return
    setSelectedHours((prev) => {
      if (replace) return sortHoursList(slice)
      return sortHoursList([...new Set([...prev, ...slice])])
    })
  }

  function clearAllHours() {
    setSelectedHours([])
  }

  function selectAllHours() {
    setSelectedHours([...hours])
  }

  const timeZones = Intl.supportedValuesOf("timeZone").filter(
    (zone) =>
      zone.startsWith("America/Sao_Paulo") ||
      zone.startsWith("America/Fortaleza") ||
      zone.startsWith("America/Recife") ||
      zone.startsWith("America/Bahia") ||
      zone.startsWith("America/Manaus") ||
      zone.startsWith("America/Cuiaba") ||
      zone.startsWith("America/Boa_Vista"),
  )

  async function onSubmit(values: ProfileFormData) {
    const response = await updateProfile({
      name: values.name,
      address: values.address,
      phone: values.phone,
      status: values.status === "active" ? true : false,
      timeZone: values.timeZone,
      times: selectedHours || [],
    })

    if (response.error) {
      toast.error(response.error)
      return
    }

    toast.success(response.data)
  }

  async function handleLogout() {
    await signOut()
    await update()
    router.replace("/")
  }

    return (
        <div className="mx-auto" >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} >
                    <Card>
                        <CardHeader>
                            <CardTitle>Meu Perfil</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6" >
                            <div className="flex justify-center" >
                                <AvatarProfile
                                   avatarUrl={user.image}
                                   userId={user.id}
                                />
                            </div>

                            <div className="space-y-4" >
                                <FormField
                                  control={form.control}
                                  name="name"
                                  render={ ({field}) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold" > Nome Completo </FormLabel>
                                        <FormControl>
                                            <Input 
                                            {...field} 
                                            placeholder=" Digite o nome da clinica... " />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="address"
                                  render={ ({field}) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold" > Endereço completo </FormLabel>
                                        <FormControl>
                                            <Input 
                                            {...field} 
                                            placeholder=" Digite o endereço da clinica... " />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="phone"
                                  render={ ({field}) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold" > Telefone </FormLabel>
                                        <FormControl>
                                            <Input 
                                            {...field} 
                                            placeholder=" (00) 00000-0000" 
                                            onChange={(e) => {
                                              const formattedValue = formatPhone(e.target.value)
                                              field.onChange(formattedValue)
                                            }}
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="status"
                                  render={ ({field}) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold" > 
                                            Status da clinica    
                                         </FormLabel>
                                        <FormControl>
                                          <Select 
                                          onValueChange={field.onChange} 
                                          defaultValue={field.value ? "active" : "inactive"}
                                          >

                                          <SelectTrigger>
                                                <SelectValue placeholder="Selecione o status da clinica" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">ATIVO ( clinica aberta )</SelectItem>
                                                <SelectItem value="inactive">INATIVO ( clinica fechada )</SelectItem>
                                            </SelectContent>

                                          </Select>
                                           
                                        </FormControl>
                                    </FormItem>
                                  )}
                                />

                                <div className="space-y-2" >
                                    <label className="font-semibold" >
                                        Configurar horários da clinica:
                                    </label>

                                    <Dialog open={dialogIsOpen} onOpenChange={setDialogIsOpen} >
                                        <DialogTrigger asChild >
                                            <Button variant="outline" className="w-full 
                                            justify-between" >
                                                Clique aqui para selecionar horários
                                                <ArrowRight className="w-5 h-5" />
                                            </Button>
                                        </DialogTrigger>

                                        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>Horários da clínica</DialogTitle>
                                                <DialogDescription>
                                                    Defina a grade de meia em meia hora. Use atalhos ou uma faixa
                                                    contínua e só depois ajuste no quadro, se precisar.
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="space-y-4 py-1">
                                                <div>
                                                    <p className="text-sm font-medium text-zinc-900">
                                                        Atalhos
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {HOUR_PRESETS.map((p) => (
                                                            <Button
                                                                key={p.label}
                                                                type="button"
                                                                variant="secondary"
                                                                size="sm"
                                                                className="text-xs"
                                                                onClick={() =>
                                                                    applyPreset(p.start, p.end)
                                                                }
                                                            >
                                                                {p.label}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
                                                    <p className="text-sm font-medium text-zinc-900">
                                                        Faixa contínua
                                                    </p>
                                                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                                        Escolha o primeiro e o último horário: todos os intervalos
                                                        de 30 minutos entre eles entram na seleção.
                                                    </p>
                                                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-zinc-600">
                                                                De
                                                            </Label>
                                                            <Select
                                                                value={rangeStart}
                                                                onValueChange={setRangeStart}
                                                            >
                                                                <SelectTrigger className="h-9 w-[132px]">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="max-h-56">
                                                                    {hours.map((h) => (
                                                                        <SelectItem key={`rs-${h}`} value={h}>
                                                                            {h}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-zinc-600">
                                                                Até
                                                            </Label>
                                                            <Select
                                                                value={rangeEnd}
                                                                onValueChange={setRangeEnd}
                                                            >
                                                                <SelectTrigger className="h-9 w-[132px]">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="max-h-56">
                                                                    {hours.map((h) => (
                                                                        <SelectItem key={`re-${h}`} value={h}>
                                                                            {h}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                onClick={() => applyCustomRange(true)}
                                                            >
                                                                Usar só esta faixa
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => applyCustomRange(false)}
                                                            >
                                                                Somar à seleção
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={selectAllHours}
                                                    >
                                                        Marcar todos
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={clearAllHours}
                                                    >
                                                        Limpar tudo
                                                    </Button>
                                                </div>

                                                <div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Ajuste fino: clique para marcar ou desmarcar um horário.
                                                    </p>
                                                    <div className="mt-2 grid max-h-52 grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-6">
                                                        {hours.map((hour) => (
                                                            <Button
                                                                key={hour}
                                                                type="button"
                                                                variant="outline"
                                                                className={cn(
                                                                    "h-9 px-1 text-xs",
                                                                    selectedHours.includes(hour) &&
                                                                        "border-2 border-emerald-500 bg-emerald-50/60 text-emerald-950",
                                                                )}
                                                                onClick={() => toggleHour(hour)}
                                                            >
                                                                {hour}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <p className="text-center text-xs text-muted-foreground">
                                                    {selectedHours.length} horário(s) na grade
                                                </p>

                                                <Button
                                                    type="button"
                                                    className="w-full"
                                                    onClick={() => setDialogIsOpen(false)}
                                                >
                                                    Fechar modal
                                                </Button>
                                            </div>
                                        </DialogContent>

                                    </Dialog>

                                </div>

                               
                                <FormField
                                  control={form.control}
                                  name="timeZone"
                                  render={ ({field}) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold" > 
                                            Selecione o fuso horário   
                                         </FormLabel>
                                        <FormControl>

                                          <Select 
                                          onValueChange={field.onChange} 
                                          defaultValue={field.value}
                                          >

                                          <SelectTrigger>
                                                <SelectValue placeholder="Selecione o seu fuso horário" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {timeZones.map((zone) => (
                                                <SelectItem key={zone} value={zone}> 
                                                {zone} 
                                                </SelectItem>
                                              ))}
                                            </SelectContent>

                                          </Select>
                                           
                                        </FormControl>
                                    </FormItem>
                                  )}
                                />
                                 
                                 <Button 
                                   type="submit"
                                   className="w-full bg-emerald-500 hover:bg-emerald-400"
                                 >
                                    Salvar alterações
                                 </Button>


                            </div>

                        </CardContent>
                    </Card>
                </form>
            </Form>
            
            <section className="mt-4" >
               <Button
                variant="destructive"
                onClick= {handleLogout}
               >
                Sair da conta
                </Button>
              </section>

        </div>
    )
}