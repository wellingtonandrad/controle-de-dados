import prisma from "@/lib/prisma"
import nodemailer from "nodemailer"

function getSmtpConfig() {
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = Number.parseInt(process.env.SMTP_PORT ?? "587", 10)
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const smtpFrom = process.env.SMTP_FROM
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) return null
  return { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom }
}

export async function sendReceivablesRemindersForOrganization(organizationId: string) {
  const smtp = getSmtpConfig()
  if (!smtp) return { error: "Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM no .env" }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const next7 = new Date(today)
  next7.setDate(next7.getDate() + 7)

  const [manualRows, installmentRows] = await Promise.all([
    prisma.receivable.findMany({
      where: {
        organizationId,
        paidAt: null,
        dueDate: { lte: next7 },
        customer: { email: { not: null } },
      },
      include: { customer: { select: { name: true, email: true } } },
      take: 500,
    }),
    prisma.appointmentInstallment.findMany({
      where: {
        paidAt: null,
        dueDate: { lte: next7 },
        appointment: { organizationId },
      },
      include: { appointment: { select: { name: true, email: true } } },
      take: 500,
    }),
  ])

  const transporter = nodemailer.createTransport({
    host: smtp.smtpHost,
    port: smtp.smtpPort,
    secure: smtp.smtpPort === 465,
    auth: { user: smtp.smtpUser, pass: smtp.smtpPass },
  })

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

  let sent = 0
  for (const row of manualRows) {
    if (!row.customer?.email) continue
    await transporter.sendMail({
      from: smtp.smtpFrom,
      to: row.customer.email,
      subject: "Lembrete de conta a receber",
      text:
        `Olá, ${row.customer.name}.\n` +
        `Lembrete: ${row.description}\n` +
        `Vencimento: ${row.dueDate.toLocaleDateString("pt-BR")}\n` +
        `Valor: ${formatCurrency(row.amountCents)}\n`,
    })
    sent += 1
  }

  for (const row of installmentRows) {
    if (!row.appointment.email) continue
    await transporter.sendMail({
      from: smtp.smtpFrom,
      to: row.appointment.email,
      subject: "Lembrete de parcela em aberto",
      text:
        `Olá, ${row.appointment.name}.\n` +
        `Lembrete da parcela ${row.sequence}.\n` +
        `Vencimento: ${row.dueDate.toLocaleDateString("pt-BR")}\n` +
        `Valor: ${formatCurrency(row.amountCents)}\n`,
    })
    sent += 1
  }

  return { ok: true as const, sent }
}

