"use server"

import prisma from "@/lib/prisma"
import { z } from "zod"
import { stripe } from "@/app/utils/stripe"
import { validateAppointmentEmail } from "@/lib/email/validate-appointment-email"

const formSchema = z.object({
    name: z.string().min(1,  "Nome é obrigatório"),
    email: z
      .string()
      .trim()
      .min(1, "E-mail é obrigatório")
      .email("Digite um e-mail válido")
      .transform((s) => s.toLowerCase()),
    phone: z.string().min(1, "Telefone é obrigatório"),
    date: z.date(),
    serviceId: z.string().min(1,  "Serviço é obrigatório"),
    time: z.string().min(1,  "Horário é obrigatório"),
    clinicId: z.string().min(1,  "Horário é obrigatório"),
})

type FormSchema = z.infer<typeof formSchema>

export async function createNewAppointment(formData: FormSchema){

    const schema = formSchema.safeParse(formData)

    if(!schema.success){
        return{
            error: schema.error.issues[0].message
        }
    }

    const emailCheck = await validateAppointmentEmail(schema.data.email)
    if (!emailCheck.ok) {
      return { error: emailCheck.message }
    }
    const patientEmail = emailCheck.normalized

    try{

        const selectedDate = new Date(schema.data.date)

        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const day = selectedDate.getDate();

        const appointmentDate = new Date(Date.UTC(year, month, day, 0,0,0,0))

        const newAppointment = await prisma.appointment.create({
            data: {
                name: schema.data.name,
                email: patientEmail,
                phone: schema.data.phone,
                time: schema.data.time,
                appointmentDate: appointmentDate,
                serviceId: schema.data.serviceId,
                userId: schema.data.clinicId
            },
            include: {
                service: true,
            },
        })

        // Parcela padrão em aberto: permite cobrar logo após agendar.
        const installment = await prisma.appointmentInstallment.create({
            data: {
                appointmentId: newAppointment.id,
                sequence: 1,
                amountCents: newAppointment.service.price,
                dueDate: appointmentDate,
                paidAt: null,
            }
        })

        let checkoutUrl: string | null = null
        try {
            const baseUrl = process.env.NEXT_PUBLIC_URL?.trim() || "http://localhost:3000"
            const checkout = await stripe.checkout.sessions.create({
                mode: "payment",
                payment_method_types: ["card"],
                billing_address_collection: "required",
                customer_email: patientEmail,
                line_items: [
                    {
                        quantity: 1,
                        price_data: {
                            currency: "brl",
                            unit_amount: installment.amountCents,
                            product_data: {
                                name: `Consulta - ${newAppointment.service.name}`,
                                description: `${schema.data.name} · ${schema.data.time} · ${new Intl.DateTimeFormat("pt-BR", {
                                    timeZone: "UTC",
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                }).format(newAppointment.appointmentDate)}`,
                            },
                        },
                    },
                ],
                success_url: `${baseUrl}/clinica/${encodeURIComponent(schema.data.clinicId)}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${baseUrl}/clinica/${encodeURIComponent(schema.data.clinicId)}?payment=cancelled`,
                metadata: {
                    type: "appointment_installment",
                    installmentId: installment.id,
                    appointmentId: newAppointment.id,
                    clinicId: schema.data.clinicId,
                },
            })
            checkoutUrl = checkout.url ?? null
        } catch (stripeErr) {
            console.error("checkout appointment error:", stripeErr)
        }

        return{
            data: newAppointment,
            checkoutUrl
        }

    }catch(err){
        console.error(err)
        return{
            error: "Erro ao cadastrar agendamento"
        }
    }
}