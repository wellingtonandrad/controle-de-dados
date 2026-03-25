"use client"

import Image from "next/image"
import imgTest from "../../../../../public/foto1.png"
import { MapPin } from "lucide-react"
import type { Prisma } from "@/lib/generated/prisma"
import { useAppointmentForm, AppointmentFormData } from "./schedule-form"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormLabel, FormMessage, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { formatPhone} from "@/app/utils/formatPhone"
import { DateTimePicker } from "./date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type UserWithServiceAndSubscription = Prisma.UserGetPayload<{
  include: {
    subscription: true,
    services: true,
  }
}>

interface ScheduleContentProps {
   clinic: UserWithServiceAndSubscription
}

export function ScheduleContent({clinic}: ScheduleContentProps)  {
    
      const form = useAppointmentForm();
      const { watch } = form

      async function handleRegisterAppointment(formData: AppointmentFormData) {
             console.log(formData)
      }
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Faixa verde: altura fixa, largura total */}
      <div className="h-40 w-full shrink-0 bg-emerald-500" />

      {/* Bloco que sobe 64px para a foto ficar meio no verde, meio no branco */}
      <section
        className="container mx-auto flex w-full justify-center px-4"
        style={{ marginTop: -64 }}
      >
        <div className="max-w-2xl flex flex-col items-center">
          {/* Círculo SEM fill: width/height fixos = foto nunca some */}
          <div className="mb-8 h-48 w-48 shrink-0 overflow-hidden rounded-full border-4 border-white">
            <Image
              src={ clinic.image ? clinic.image : imgTest}
              alt="Foto da clinica"
              width={192}
              height={192}
              className="h-full w-full object-cover"
            />
          </div>

          <h1 className="text-2xl font-bold mb-2">
             {clinic.name}    
          </h1>
          <div className="flex items-center gap-1">
            <MapPin className="h-5 w-4" />
            <span>
             {clinic.address ? clinic.address : "Endereço não informado" }
            </span>
          </div>
        </div>
      </section>

      <section className= "max-w-2xl mx-auto w-full mt-6" >
    {/* Formulário de agendamento */}
     
    <Form {...form}>
        <form 
        onSubmit={form.handleSubmit(handleRegisterAppointment)}
        className= "mx-2 space-y-6 bg-white p-6 border rounded-md shadow-sm"
         >

          
            
            <FormField 
             control={form.control}
             name="name"
             render={({ field }) => ( 
               
               <FormItem className = "my-2" >
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
              
              <FormItem className = "my-2" >
                <FormLabel className="font-semibold">Email:</FormLabel>
                <FormControl>
                   <Input 
                     id="email"
                     placeholder="Digite seu email..."
                     {...field}
                   />
                </FormControl>
                <FormMessage/>
              </FormItem>
               
            )}
           />

           <FormField 
           control={form.control}
           name="phone"
           render={({ field }) => ( 
             
             <FormItem className = "my-2" >
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
             <FormItem className = "flex items-center gap-1 space-y-1" >
               <FormLabel className="font-semibold">Data do agendamento:</FormLabel>
               <FormControl>
                 <DateTimePicker
                  initialDate={new Date()}
                  className="w-full rounded border p-2"
                  onChange={(date: Date) => {
                    if(date){
                      field.onChange(date)
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
             <FormItem className = "" >
               <FormLabel className="font-semibold">Selecione o serviço:</FormLabel>
               <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value} >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um serviço"/>
                    </SelectTrigger>
                    <SelectContent>
                      {clinic.services.map((service) => (
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

         {clinic.status ? ( 
             <Button 
             type="submit"
             className="w-full bg-emerald-500 hover:bg-emerald-400"
             disabled={!watch("name") || !watch("email") || !watch("phone") || !watch("date")} 
             >
               Realizar agendamento
             </Button>
   

          ) : (

            
            <p className="w-full text-center bg-red-500 text-white px-4 py-2 rounded-md">
              A clinica está fechada neste momento.
            </p>
            
         )}

          </form>
        </Form>
      </section>

    </div>
  )
}