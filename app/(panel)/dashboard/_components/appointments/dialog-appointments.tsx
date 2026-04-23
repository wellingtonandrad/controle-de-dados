"use client"

import {
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AppointmentWithService } from "./appointments-list"
import { formatCurrency } from "@/app/utils/formatCurrency"
import { AppointmentInstallmentsEditor } from "./appointment-installments-editor"

const STATUS_LABELS: Record<AppointmentWithService["status"], string> = {
  SCHEDULED: "Agendado",
  COMPLETED: "Concluído",
  NO_SHOW: "Faltou",
  CANCELED: "Cancelado",
}

interface DialogAppointmentProps {
  appointment?: AppointmentWithService | null;
}

export function DialogAppointment({ appointment }: DialogAppointmentProps) { 
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Detalhes do Agendamento</DialogTitle>
        <DialogDescription>
          Veja todos os detalhes do agendamento:
        </DialogDescription>
      </DialogHeader>

      <div className="py-4">
         {appointment &&  (
           <article>
              <p className="mb-2">
                <span className="font-semibold">Status:</span>{" "}
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-sm">
                  {STATUS_LABELS[appointment.status ?? "SCHEDULED"]}
                </span>
              </p>
              <p><span className="font-semibold" >Horário:</span>{appointment.time}</p>
              <p className="mb-2" ><span className="font-semibold" >Data do agendamento:</span>{new Intl.DateTimeFormat('pt-BR', {
                timeZone: "UTC",
                year: "numeric",
                month: "numeric",
                day: "2-digit",
              }).format(new Date(appointment.appointmentDate))}
              </p>
              <p><span className="font-semibold" >Nome:</span>{appointment.name}</p>
              <p><span className="font-semibold" >Telefone:</span>{appointment.phone}</p>
              <p><span className="font-semibold" >Email:</span>{appointment.email}</p>

              <section className="bg-gray-200 mt-4 p-2 rounded-md">
                <p><span className="font-semibold">Serviço</span> {appointment.service.name}</p>
                <p><span className="font-semibold">Valor</span> {formatCurrency((appointment.service.price / 100))}</p>  
              </section>

              <AppointmentInstallmentsEditor
                appointmentId={appointment.id}
                servicePriceCents={appointment.service.price}
                appointmentDate={appointment.appointmentDate}
                status={appointment.status}
              />

           </article>
         )}
      </div>
    </DialogContent>
  )
}
