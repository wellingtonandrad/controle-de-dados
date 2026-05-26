"use client"

import { useState, useCallback, useEffect } from "react"
import { MapPin, MessageCircle, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { PublicScheduleOrganization } from "../_date-acess/get-info-schedule"
import { useAppointmentForm, AppointmentFormData } from "./schedule-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormItem,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { formatPhone} from "@/app/utils/formatPhone"
import { DateTimePicker } from "./date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScheduleTimeList } from "./schedule-time-list"
import { Label } from "@/components/ui/label"
import { createNewAppointment } from "../_actions/create-appointment"
import { toast } from "sonner"
import { OrganizationCardImage } from "@/app/(public)/_components/organization-card-image"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function mapsSearchUrl(address: string | null | undefined) {
  const q = address?.trim()
  if (!q) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

/** Número internacional para wa.me (Brasil: DDD + celular/fixo, com ou sem 55). */
function whatsappUrlFromDigits(digits: string): string | null {
  const d = digits.replace(/\D/g, "")
  if (d.length < 10) return null
  const n = d.startsWith("55") ? d : `55${d}`
  if (n.length < 12) return null
  return `https://wa.me/${n}`
}

interface ScheduleContentProps {
  organization: PublicScheduleOrganization
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export function ScheduleContent({ organization }: ScheduleContentProps) {
    
      const form = useAppointmentForm();
      const { watch } = form;

      const phoneDigits = organization.phone?.replace(/\D/g, "") ?? ""
      const showPhoneLink = Boolean(
        organization.phone?.trim() && phoneDigits.length >= 8,
      )
      const whatsappUrl = whatsappUrlFromDigits(phoneDigits)

      const selectedDate = watch("date")
      const selectedServiceId = watch("serviceId")

      const [selectedTime, setSelectedTime] = useState("");
      const [avaibleTimeSlots, setAvaibleTimeSlots] = useState<TimeSlot[]>([]);
      const [loadingSlots, setLoadingSlots] = useState(false);
      const [confirmation, setConfirmation] = useState<{
        patientName: string
        serviceName: string
        date: Date
        time: string
        checkoutUrl: string | null
      } | null>(null)
      
      //código que busca horários bloqueados 
      const [blockedTimes, setBlockedTimes] = useState<string[]>([])

      //esse código busca os horário bloqueados (via fetch HTTp)
      const fetchBlockedTimes = useCallback(async (date: Date): Promise<string[]> => {
        setLoadingSlots(true)
        try {
          const dateString = date.toISOString().split("T")[0]
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_URL}/api/schedule/get-appointments?organizationId=${organization.id}&date=${dateString}`,
          )

           const json = await response.json();
           setLoadingSlots(false);
           return json;

         
        } catch (err) {
          console.log(err)
          setLoadingSlots(false)
          return [];
        }  
      }, [organization.id])

        useEffect(() => {

          if(selectedDate){
             fetchBlockedTimes(selectedDate).then((blocked) => {
                  
                setBlockedTimes(blocked)

                const times = organization.times || [];

                const finalSlots = times.map((time) => ({
                  time: time,
                  available: !blocked.includes(time)
                }))
                  
                setAvaibleTimeSlots(finalSlots)

                const stillAvaible = finalSlots.find(
                  (slot) => slot.time === selectedTime && slot.available
                )  

                if(!stillAvaible) {
                   setSelectedTime("");
                }

               

             })
          }

        }, [selectedDate, organization.times, fetchBlockedTimes, selectedTime])

      async function handleRegisterAppointment(formData: AppointmentFormData) {
             if(!selectedTime){
              return;
      }

      const response = await createNewAppointment({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        time: selectedTime,
        date: formData.date,
        serviceId: formData.serviceId,
        organizationId: organization.id

      })

    if(response.error){
        toast.error(response.error)
        return;
    }

    const serviceName =
      organization.services.find((s) => s.id === formData.serviceId)?.name ??
      "Serviço selecionado"

    setConfirmation({
      patientName: formData.name,
      serviceName,
      date: formData.date,
      time: selectedTime,
      checkoutUrl: response.checkoutUrl ?? null,
    })

    toast.success("Consulta agendada com sucesso!")
    form.reset()
    setSelectedTime("")
    }
  


  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="h-40 w-full shrink-0 bg-emerald-500" />

      <section
        className="container mx-auto flex w-full justify-center px-4"
        style={{ marginTop: -64 }}
      >
        <div className="flex max-w-2xl flex-col items-center">
          <div className="mb-8 h-48 w-48 shrink-0 overflow-hidden rounded-full border-4 border-white bg-zinc-100 shadow-lg">
            <OrganizationCardImage imageUrl={organization.image} name={organization.name} />
          </div>

          <h1 className="mb-2 text-center text-2xl font-bold">
            {organization.name ?? "Empresa"}
          </h1>
          <p className="mb-4 text-center text-sm text-gray-600">
            Agendamento online
          </p>

          <div className="w-full max-w-md space-y-3 rounded-xl border border-zinc-100 bg-zinc-50/90 px-4 py-3 text-sm text-zinc-800">
            <div className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span className="leading-snug">
                {organization.address?.trim() || "Endereço não informado"}
              </span>
            </div>
            {showPhoneLink ? (
              <div className="flex flex-wrap items-center gap-2">
                <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <a
                  href={whatsappUrl ?? `tel:${phoneDigits}`}
                  target={whatsappUrl ? "_blank" : undefined}
                  rel={whatsappUrl ? "noopener noreferrer" : undefined}
                  className="font-medium text-emerald-700 hover:underline"
                >
                  {organization.phone}
                </a>
                {whatsappUrl ? (
                  <span className="text-xs text-zinc-500">(WhatsApp)</span>
                ) : null}
              </div>
            ) : null}
            {mapsSearchUrl(organization.address) ? (
              <a
                href={mapsSearchUrl(organization.address) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Como chegar (Google Maps)
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 w-full max-w-2xl">
    <Form {...form}>
        <form 
        onSubmit={form.handleSubmit(handleRegisterAppointment)}
        className="mx-2 space-y-6 rounded-md border bg-white p-6 shadow-sm"
         >

          {organization.services.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Não há serviços disponíveis para agendamento online neste momento.
              Entre em contato com a empresa.
            </div>
          ) : null}

            
            <FormField 
             control={form.control}
             name="name"
             render={({ field }) => ( 
               
               <FormItem className="my-2">
                 <FormLabel className="font-semibold">Nome completo:</FormLabel>
                 <FormControl>
                    <Input 
                      id="name"
                      placeholder="Digite seu nome completo..."
                      {...field}
                    />


                 </FormControl>
                 <FormMessage/>
               </FormItem>
                
              )}
            />
        
            <FormField 
            control={form.control}
            name="email"
            render={({ field }) => ( 
              
              <FormItem className="my-2">
                <FormLabel className="font-semibold">E-mail:</FormLabel>
                <FormControl>
                   <Input 
                     id="email"
                     type="email"
                     autoComplete="email"
                     inputMode="email"
                     placeholder="seu@email.com"
                     {...field}
                   />
                </FormControl>
                <FormDescription className="text-xs">
                  Use um e-mail que você acessa. Endereços falsos ou temporários
                  não são aceitos.
                </FormDescription>
                <FormMessage/>
              </FormItem>
               
            )}
           />

           <FormField 
           control={form.control}
           name="phone"
           render={({ field }) => ( 
             
             <FormItem className="my-2">
               <FormLabel className="font-semibold">Telefone:</FormLabel>
               <FormControl>
                  <Input 
                     {...field}
                    id="phone"
                    placeholder="(XX) XXXXX-XXXX"
                    onChange= { (e: React.ChangeEvent<HTMLInputElement>) => {
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
           name="date"
           render={({ field }) => ( 
             <FormItem className="flex items-center gap-1 space-y-1">
               <FormLabel className="font-semibold">Data do agendamento:</FormLabel>
               <FormControl>
                 <DateTimePicker
                  initialDate={new Date()}
                  className="w-full rounded border p-2"
                  onChange={(date: Date) => {
                    if(date){
                      field.onChange(date)
                      setSelectedTime("")
                    }
                  } }
                 />
               </FormControl>
               <FormMessage/>
             </FormItem>
              
           )}
          />

          
           <FormField 
           control={form.control}
           name="serviceId"
           render={({ field }) => ( 
             <FormItem>
               <FormLabel className="font-semibold">Selecione o serviço:</FormLabel>
               <FormControl>
                  <Select onValueChange={(value) => {
                     field.onChange(value)
                     setSelectedTime("")
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um serviço"/>
                    </SelectTrigger>
                    <SelectContent>
                      {organization.services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </FormControl>
               <FormMessage/>
             </FormItem>
              
           )}
          />

          {selectedServiceId && organization.services.length > 0 && (
            <div className="space-y-2">
                <Label className="font-semibold">Horários disponíveis:</Label>
                <div className="rounded-lg bg-gray-50 p-4" >
                    {loadingSlots ? (
                      <div className="grid grid-cols-4 gap-2 md:grid-cols-5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-10 animate-pulse rounded-md bg-zinc-200"
                          />
                        ))}
                      </div>
                    ) : !(organization.times && organization.times.length > 0) ? (
                      <p className="text-sm text-amber-900">
                        Esta empresa ainda não cadastrou horários de atendimento. Entre em
                        contato com a recepção.
                      </p>
                    ) : !avaibleTimeSlots.some((s) => s.available) ? (
                      <p className="text-sm text-zinc-700">
                        Todos os horários deste dia já estão reservados ou indisponíveis.
                        Escolha outra data.
                      </p>
                    ) : (
                      <ScheduleTimeList
                         onSelectTime={(time) => setSelectedTime(time) }
                         organizationTimes={organization.times}
                         blockedTimes={blockedTimes}
                         avaibleTimeSlots={avaibleTimeSlots}
                         selectedTime={selectedTime}
                         selectedDate={selectedDate}
                         requiredSlots={
                          organization.services.find(service => service.id === selectedServiceId) ? Math.ceil(organization.services.find(service => 
                            service.id === selectedServiceId)!.duration /30) : 1
                          
                         }
                      />
                    )}
                </div>
            </div>
          )}

         {organization.status ? ( 
             <Button 
             type="submit"
             className="w-full bg-emerald-500 hover:bg-emerald-500"
             disabled={
              organization.services.length === 0 ||
              !watch("name") ||
              !watch("email") ||
              !watch("phone") ||
              !watch("date") ||
              !watch("serviceId") ||
              !selectedTime ||
              loadingSlots
            } 
             >
               Realizar agendamento
             </Button>
   

          ) : (

            
            <p className="w-full rounded-md bg-red-500 px-4 py-2 text-center text-white">
              A empresa está fechada neste momento.
            </p>
            
         )}

          </form>
        </Form>
      </section>

      <Dialog
        open={!!confirmation}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agendamento confirmado</DialogTitle>
          </DialogHeader>
          {confirmation ? (
            <div className="space-y-3 text-sm text-zinc-700">
              <p>
                Olá, <strong>{confirmation.patientName}</strong> — sua consulta em{" "}
                <strong>{organization.name ?? "Empresa"}</strong> foi registrada.
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  Serviço: <strong>{confirmation.serviceName}</strong>
                </li>
                <li>
                  Data:{" "}
                  <strong>
                    {format(confirmation.date, "EEEE, d 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </strong>
                </li>
                <li>
                  Horário: <strong>{confirmation.time}</strong>
                </li>
              </ul>
              <p className="text-sm text-zinc-600">
                Recomendamos chegar com cerca de{" "}
                <strong>10 minutos de antecedência</strong>. Se precisar remarcar ou
                cancelar, avise a empresa o quanto antes.
              </p>
              <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
                {confirmation.checkoutUrl ? (
                  <>
                    Sua consulta foi criada. Você pode seguir para o pagamento agora
                    pelo Stripe.
                  </>
                ) : (
                  <>
                    Sua consulta foi criada. No momento, o checkout online não está
                    disponível; finalize o pagamento diretamente com a empresa.
                  </>
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            {confirmation?.checkoutUrl ? (
              <Button
                type="button"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  window.location.href = confirmation.checkoutUrl as string
                }}
              >
                Realizar pagamento
              </Button>
            ) : null}
            <Button type="button" onClick={() => setConfirmation(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}