"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Prisma } from "@/lib/generated/prisma"
import { Button } from "@/components/ui/button"
import { Check, Eye, RotateCcw, UserX, X } from "lucide-react"
import { cancelAppointment } from "../../_actions/cancel-appointment"
import { toast } from "sonner"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { DialogAppointment } from "./dialog-appointments"
import { ButtonPickerAppointment } from "./button-date"
import { updateAppointmentStatus } from "../../_actions/update-appointment-status"
import { cn } from "@/lib/utils"
import { utcCalendarDateKey } from "@/app/utils/utc-calendar-date-key"

export type AppointmentWithService = Prisma.AppointmentGetPayload<{
  include: {
    service: true
  }
}>

interface AppointmentsListProps {
  times: string[]
}

const STATUS_LABELS = {
  SCHEDULED: "Agendado",
  COMPLETED: "Concluído",
  NO_SHOW: "Faltou",
  CANCELED: "Cancelado",
} as const

const STATUS_STYLES = {
  SCHEDULED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  NO_SHOW: "bg-amber-50 text-amber-700",
  CANCELED: "bg-zinc-100 text-zinc-700",
} as const

type StatusSummaryKey = keyof typeof STATUS_LABELS

/** Índice do slot na grade (`times`) ou -1 se o horário não existir na grade. */
function slotStartIndex(times: string[], appointmentTime: string): number {
  const t = appointmentTime.trim()
  return times.findIndex((slot) => slot.trim() === t)
}

/** yyyy-MM-dd (UTC) → dd/MM/yyyy sem depender do fuso da máquina. */
function formatAgendaDayBrFromKey(ymd: string) {
  const [y, m, d] = ymd.split("-")
  if (!y || !m || !d) return ymd
  return `${d}/${m}/${y}`
}

function registroCardRing(status: StatusSummaryKey) {
  switch (status) {
    case "SCHEDULED":
      return "border-violet-300 bg-violet-50/50 ring-2 ring-violet-400/50"
    case "COMPLETED":
      return "border-emerald-300 bg-emerald-50/50 ring-2 ring-emerald-400/50"
    case "NO_SHOW":
      return "border-amber-300 bg-amber-50/50 ring-2 ring-amber-400/50"
    case "CANCELED":
      return "border-zinc-300 bg-zinc-50/60 ring-2 ring-zinc-400/45"
    default:
      return ""
  }
}

export function AppointmentsList({ times }: AppointmentsListProps) {
  const searchParams = useSearchParams()
  const rawDateParam = searchParams.get("date")
  const activeViewDate =
    rawDateParam && /^\d{4}-\d{2}-\d{2}$/.test(rawDateParam)
      ? rawDateParam
      : format(new Date(), "yyyy-MM-dd")
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [detailAppointment, setDetailAppointment] = useState<AppointmentWithService | null>(null)
  const [summarySheetStatus, setSummarySheetStatus] = useState<StatusSummaryKey | null>(null)
  /** Qual card de status está com o painel de registro aberto (null = nenhum). */
  const [registroPanel, setRegistroPanel] = useState<StatusSummaryKey | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["get-appointments", activeViewDate],
    queryFn: async () => {
      const url = `${process.env.NEXT_PUBLIC_URL}/api/clinic/appointments?date=${activeViewDate}`

      const response = await fetch(url)

      const json = (await response.json()) as AppointmentWithService[]

      if (!response.ok) {
        return []
      }

      return json
    },

    staleTime: 20000,
    refetchInterval: 30000,
  })

  const { data: upcomingScheduled } = useQuery({
    queryKey: ["scheduled-upcoming"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/clinic/appointments/scheduled-upcoming`,
      )
      const json = (await response.json()) as AppointmentWithService[]
      if (!response.ok) {
        return []
      }
      return json
    },
    staleTime: 20000,
    refetchInterval: 30000,
  })

  const { data: completedRecent } = useQuery({
    queryKey: ["completed-recent"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/clinic/appointments/completed-recent`,
      )
      const json = (await response.json()) as AppointmentWithService[]
      if (!response.ok) {
        return []
      }
      return json
    },
    staleTime: 20000,
    refetchInterval: 30000,
  })

  const { data: noShowRecent } = useQuery({
    queryKey: ["no-show-recent"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/clinic/appointments/no-show-recent`,
      )
      const json = (await response.json()) as AppointmentWithService[]
      if (!response.ok) {
        return []
      }
      return json
    },
    staleTime: 20000,
    refetchInterval: 30000,
  })

  const { data: canceledRecent } = useQuery({
    queryKey: ["canceled-recent"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/clinic/appointments/canceled-recent`,
      )
      const json = (await response.json()) as AppointmentWithService[]
      if (!response.ok) {
        return []
      }
      return json
    },
    staleTime: 20000,
    refetchInterval: 30000,
  })

  const recentScheduledCount = upcomingScheduled?.length ?? 0
  const recentCompletedCount = completedRecent?.length ?? 0
  const recentNoShowCount = noShowRecent?.length ?? 0
  const recentCanceledCount = canceledRecent?.length ?? 0

  useEffect(() => {
    setRegistroPanel(null)
  }, [activeViewDate])

  useEffect(() => {
    if (registroPanel === "SCHEDULED" && recentScheduledCount === 0) {
      setRegistroPanel(null)
    }
    if (registroPanel === "COMPLETED" && recentCompletedCount === 0) {
      setRegistroPanel(null)
    }
    if (registroPanel === "NO_SHOW" && recentNoShowCount === 0) {
      setRegistroPanel(null)
    }
    if (registroPanel === "CANCELED" && recentCanceledCount === 0) {
      setRegistroPanel(null)
    }
  }, [
    registroPanel,
    recentScheduledCount,
    recentCompletedCount,
    recentNoShowCount,
    recentCanceledCount,
  ])

  const ocupantMap: Record<string, AppointmentWithService> = {}
  const statusSummary = {
    SCHEDULED: 0,
    COMPLETED: 0,
    NO_SHOW: 0,
    CANCELED: 0,
  }

  if (data && data.length > 0) {
    for (const appointment of data) {
      const st = appointment.status ?? "SCHEDULED"
      statusSummary[st]++

      if (st === "CANCELED") {
        continue
      }

      const requiredSlot = Math.ceil(appointment.service.duration / 30)

      const startIndex = slotStartIndex(times, appointment.time)

      if (startIndex !== -1) {
        for (let i = 0; i < requiredSlot; i++) {
          const slotIndex = startIndex + i

          if (slotIndex < times.length) {
            ocupantMap[times[slotIndex]] = appointment
          }
        }
      }
    }
  }

  const offGridAppointments = useMemo(() => {
    if (!data?.length) return []
    return data.filter((a) => {
      if ((a.status ?? "SCHEDULED") === "CANCELED") return false
      return slotStartIndex(times, a.time) === -1
    })
  }, [data, times])

  const scheduledToday = useMemo(() => {
    return (data ?? []).filter((a) => (a.status ?? "SCHEDULED") === "SCHEDULED")
  }, [data])

  const scheduledTodaySorted = useMemo(
    () =>
      [...scheduledToday].sort((a, b) =>
        a.time.trim().localeCompare(b.time.trim()),
      ),
    [scheduledToday],
  )

  const summarySheetAppointments = useMemo(() => {
    if (!summarySheetStatus || !data?.length) return []
    return data
      .filter((a) => (a.status ?? "SCHEDULED") === summarySheetStatus)
      .sort((a, b) => a.time.trim().localeCompare(b.time.trim()))
  }, [summarySheetStatus, data])

  async function handleCancelAppointment(appointmentId: string) {
    const response = await cancelAppointment({ appointmentId: appointmentId })

    if (response.error) {
      toast.error(response.error)
      return
    }

    queryClient.invalidateQueries({ queryKey: ["get-appointments"] })
    queryClient.invalidateQueries({ queryKey: ["scheduled-upcoming"] })
    queryClient.invalidateQueries({ queryKey: ["completed-recent"] })
    queryClient.invalidateQueries({ queryKey: ["no-show-recent"] })
    queryClient.invalidateQueries({ queryKey: ["canceled-recent"] })
    queryClient.invalidateQueries({ queryKey: ["appointment-installments"] })
    queryClient.invalidateQueries({ queryKey: ["reports-dashboard"] })
    await refetch()
    toast.success(response.data)
  }

  async function handleUpdateStatus(
    appointmentId: string,
    status: "COMPLETED" | "NO_SHOW" | "SCHEDULED" | "CANCELED",
  ) {
    const response = await updateAppointmentStatus({ appointmentId, status })

    if (response.error) {
      toast.error(response.error)
      return
    }

    queryClient.invalidateQueries({ queryKey: ["get-appointments"] })
    queryClient.invalidateQueries({ queryKey: ["scheduled-upcoming"] })
    queryClient.invalidateQueries({ queryKey: ["completed-recent"] })
    queryClient.invalidateQueries({ queryKey: ["no-show-recent"] })
    queryClient.invalidateQueries({ queryKey: ["canceled-recent"] })
    queryClient.invalidateQueries({ queryKey: ["appointment-installments"] })
    queryClient.invalidateQueries({ queryKey: ["reports-dashboard"] })
    await refetch()
    toast.success(response.data)
  }

  return (
    <>
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl md:text-2xl font-bold">
            Agendamentos
          </CardTitle>

          <ButtonPickerAppointment />
        </CardHeader>

        <CardContent>
          <section className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {(["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELED"] as const).map((status) => {
              const count =
                status === "SCHEDULED"
                  ? recentScheduledCount
                  : status === "COMPLETED"
                    ? recentCompletedCount
                    : status === "NO_SHOW"
                      ? recentNoShowCount
                      : recentCanceledCount
              const interactive = count > 0
              const open = registroPanel === status
              return (
                <button
                  key={status}
                  type="button"
                  disabled={!interactive}
                  onClick={() =>
                    setRegistroPanel((p) => (p === status ? null : status))
                  }
                  className={cn(
                    "rounded-md border p-3 text-left transition-colors",
                    interactive
                      ? "cursor-pointer hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      : "cursor-default opacity-60",
                    interactive && open && registroCardRing(status),
                  )}
                >
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    {STATUS_LABELS[status]}
                  </p>
                  <p className="mt-1 text-xl font-semibold">{count}</p>
                  {interactive ? (
                    <p className="mt-1 text-[11px] font-medium leading-tight text-blue-700">
                      {open
                        ? "Toque para ocultar o registro"
                        : "Toque para ver o registro"}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] leading-tight text-zinc-500">
                      {status === "SCHEDULED"
                        ? "Hoje até 6 meses"
                        : "Últimos 45 dias"}
                    </p>
                  )}
                </button>
              )
            })}
          </section>

          {!isLoading &&
          registroPanel === "SCHEDULED" &&
          (upcomingScheduled?.length ?? 0) > 0 ? (
            <div className="mb-3 rounded-lg border border-violet-200 bg-violet-50/70 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-950">
                  Agendados futuros
                </p>
                {statusSummary.SCHEDULED > 0 ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs font-medium text-violet-900 underline-offset-2 hover:underline"
                    onClick={() => setSummarySheetStatus("SCHEDULED")}
                  >
                    Só deste dia na lista
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] leading-snug text-violet-900/85">
                Consultas ainda <strong>Agendadas</strong> a partir de hoje (até 6
                meses). O número no card <strong>Agendado</strong> é a quantidade
                deste registro.
              </p>
              <ul className="mt-2 max-h-[min(22rem,50vh)] space-y-2 overflow-y-auto pr-1">
                {(upcomingScheduled ?? []).map((appt) => {
                  const dayKey = utcCalendarDateKey(appt.appointmentDate)
                  return (
                    <li
                      key={appt.id}
                      className="flex flex-col gap-2 rounded-md border border-violet-200/80 bg-white p-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-900">{appt.name}</div>
                        <div className="mt-0.5 text-xs text-zinc-600">
                          <span className="font-medium text-violet-900">
                            {formatAgendaDayBrFromKey(dayKey)}
                          </span>
                          {" · "}
                          {appt.time} · {appt.service.name}
                          {" · "}
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(appt.service.price / 100)}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1 sm:flex-col">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setDetailAppointment(appt)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Detalhes
                        </Button>
                        <Link
                          href={`/dashboard?date=${encodeURIComponent(dayKey)}`}
                          className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          Abrir este dia
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {!isLoading &&
          registroPanel === "COMPLETED" &&
          (completedRecent?.length ?? 0) > 0 ? (
            <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-950">
                  Concluídos recentes
                </p>
                {statusSummary.COMPLETED > 0 ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs font-medium text-emerald-900 underline-offset-2 hover:underline"
                    onClick={() => setSummarySheetStatus("COMPLETED")}
                  >
                    Só deste dia na lista
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] leading-snug text-emerald-900/85">
                Consultas marcadas como <strong>Concluído</strong> nos últimos 45 dias
                (data em que você marcou como concluído). O número no card{" "}
                <strong>Concluído</strong> é a quantidade deste registro.
              </p>
              <ul className="mt-2 max-h-[min(22rem,50vh)] space-y-2 overflow-y-auto pr-1">
                {(completedRecent ?? []).map((appt) => {
                  const dayKey = utcCalendarDateKey(appt.appointmentDate)
                  const concludedAt = format(
                    new Date(appt.updatedAt),
                    "dd/MM/yyyy 'às' HH:mm",
                    { locale: ptBR },
                  )
                  return (
                    <li
                      key={appt.id}
                      className="flex flex-col gap-2 rounded-md border border-emerald-200/80 bg-white p-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-900">{appt.name}</div>
                        <div className="mt-0.5 text-xs text-zinc-600">
                          Consulta:{" "}
                          <span className="font-medium text-emerald-900">
                            {formatAgendaDayBrFromKey(dayKey)}
                          </span>
                          {" · "}
                          {appt.time} · {appt.service.name}
                        </div>
                        <div className="mt-1 text-[11px] text-emerald-900/80">
                          Concluído em {concludedAt}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1 sm:flex-col">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setDetailAppointment(appt)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Detalhes
                        </Button>
                        <Link
                          href={`/dashboard?date=${encodeURIComponent(dayKey)}`}
                          className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          Dia da consulta
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {!isLoading &&
          registroPanel === "NO_SHOW" &&
          (noShowRecent?.length ?? 0) > 0 ? (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-950">
                  Faltas recentes
                </p>
                {statusSummary.NO_SHOW > 0 ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs font-medium text-amber-900 underline-offset-2 hover:underline"
                    onClick={() => setSummarySheetStatus("NO_SHOW")}
                  >
                    Só deste dia na lista
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] leading-snug text-amber-900/85">
                Consultas marcadas como <strong>Faltou</strong> nos últimos 45 dias
                (data do registro). O número no card <strong>Faltou</strong> é a
                quantidade deste registro.
              </p>
              <ul className="mt-2 max-h-[min(22rem,50vh)] space-y-2 overflow-y-auto pr-1">
                {(noShowRecent ?? []).map((appt) => {
                  const dayKey = utcCalendarDateKey(appt.appointmentDate)
                  const markedAt = format(
                    new Date(appt.updatedAt),
                    "dd/MM/yyyy 'às' HH:mm",
                    { locale: ptBR },
                  )
                  return (
                    <li
                      key={appt.id}
                      className="flex flex-col gap-2 rounded-md border border-amber-200/80 bg-white p-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-900">{appt.name}</div>
                        <div className="mt-0.5 text-xs text-zinc-600">
                          Consulta:{" "}
                          <span className="font-medium text-amber-900">
                            {formatAgendaDayBrFromKey(dayKey)}
                          </span>
                          {" · "}
                          {appt.time} · {appt.service.name}
                        </div>
                        <div className="mt-1 text-[11px] text-amber-900/80">
                          Registrado em {markedAt}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1 sm:flex-col">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setDetailAppointment(appt)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Detalhes
                        </Button>
                        <Link
                          href={`/dashboard?date=${encodeURIComponent(dayKey)}`}
                          className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          Dia da consulta
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {!isLoading &&
          registroPanel === "CANCELED" &&
          (canceledRecent?.length ?? 0) > 0 ? (
            <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-800">
                  Cancelamentos recentes
                </p>
                {statusSummary.CANCELED > 0 ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs font-medium text-zinc-800 underline-offset-2 hover:underline"
                    onClick={() => setSummarySheetStatus("CANCELED")}
                  >
                    Só deste dia na lista
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] leading-snug text-zinc-700">
                Consultas <strong>Canceladas</strong> nos últimos 45 dias (data do
                registro). O número no card <strong>Cancelado</strong> é a
                quantidade deste registro.
              </p>
              <ul className="mt-2 max-h-[min(22rem,50vh)] space-y-2 overflow-y-auto pr-1">
                {(canceledRecent ?? []).map((appt) => {
                  const dayKey = utcCalendarDateKey(appt.appointmentDate)
                  const markedAt = format(
                    new Date(appt.updatedAt),
                    "dd/MM/yyyy 'às' HH:mm",
                    { locale: ptBR },
                  )
                  return (
                    <li
                      key={appt.id}
                      className="flex flex-col gap-2 rounded-md border border-zinc-200/90 bg-white p-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-900">{appt.name}</div>
                        <div className="mt-0.5 text-xs text-zinc-600">
                          Consulta:{" "}
                          <span className="font-medium text-zinc-800">
                            {formatAgendaDayBrFromKey(dayKey)}
                          </span>
                          {" · "}
                          {appt.time} · {appt.service.name}
                        </div>
                        <div className="mt-1 text-[11px] text-zinc-600">
                          Cancelado em {markedAt}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1 sm:flex-col">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setDetailAppointment(appt)
                            setIsDialogOpen(true)
                          }}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Detalhes
                        </Button>
                        <Link
                          href={`/dashboard?date=${encodeURIComponent(dayKey)}`}
                          className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          Dia da consulta
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {!isLoading && scheduledTodaySorted.length > 0 ? (
            <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-950">
                  Quem agendou hoje
                </p>
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-blue-800 underline-offset-2 hover:underline"
                  onClick={() => setSummarySheetStatus("SCHEDULED")}
                >
                  Ver lista completa
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {scheduledTodaySorted.map((appt) => {
                  const onGrid = slotStartIndex(times, appt.time) !== -1
                  return (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={() => {
                        setDetailAppointment(appt)
                        setIsDialogOpen(true)
                      }}
                      className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-full border border-blue-200/90 bg-white px-3 py-1.5 text-left text-sm text-blue-950 shadow-sm transition-colors hover:bg-blue-50/90"
                    >
                      <span className="font-semibold">{appt.name}</span>
                      <span className="text-xs font-normal text-blue-900/85">
                        {appt.time}
                      </span>
                      {!onGrid ? (
                        <span className="text-[10px] font-medium text-amber-700">
                          fora da grade
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-[11px] leading-snug text-blue-900/80">
                Toque no nome para abrir a ficha. Abaixo você conclui ou cancela sem
                procurar na grade.
              </p>
            </div>
          ) : null}

          {!isLoading && scheduledToday.length > 0 ? (
            <div className="mb-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-3">
              <p className="text-sm font-semibold text-sky-950">
                Consulta(s) ainda <span className="font-bold">agendada(s)</span> neste
                dia
              </p>
              <p className="mt-1 text-xs leading-relaxed text-sky-900">
                Elas também aparecem na lista por horário (role para cima se não
                estiver vendo). Use os botões aqui para concluir sem procurar na
                grade.
              </p>
              <ul className="mt-2 space-y-2">
                {scheduledToday.map((ocupant) => {
                  const onGrid = slotStartIndex(times, ocupant.time) !== -1
                  return (
                    <li
                      key={ocupant.id}
                      className="flex flex-col gap-2 rounded-md border border-sky-200/80 bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="font-semibold text-zinc-900">{ocupant.name}</div>
                        <div className="mt-0.5 text-xs text-zinc-600">
                          <span className="font-medium text-zinc-800">{ocupant.time}</span>
                          {" · "}
                          {ocupant.service.name}
                          {" · "}
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(ocupant.service.price / 100)}
                          {!onGrid ? (
                            <span className="ml-1 text-amber-700">
                              (horário fora da grade cadastrada)
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDetailAppointment(ocupant)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            Detalhes
                          </Button>
                        </DialogTrigger>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleUpdateStatus(ocupant.id, "COMPLETED")}
                        >
                          Concluir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(ocupant.id, "NO_SHOW")}
                        >
                          Faltou
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelAppointment(ocupant.id)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          <ScrollArea className="h-[calc(100vh-20rem)] lg:h-[calc(100vh-15rem)] pr-4">
            {isLoading ? (
              <p>Carregando agenda</p>
            ) : (
              times.map((slot) => {
                const ocupant = ocupantMap[slot]

                if (ocupant) {
                  const rowStatus = ocupant.status ?? "SCHEDULED"
                  return (
                    <div
                      key={slot}
                      className="flex items-center py-2 border-t last:border-b"
                    >
                      <div className="w-16 text-sm font-semibold">{slot}</div>
                      <div className="flex-1 text-sm">
                        <div className="font-semibold">{ocupant.name}</div>
                        <div className="mt-1">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[rowStatus]}`}
                          >
                            {STATUS_LABELS[rowStatus]}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {ocupant.phone}
                        </div>
                      </div>

                      <div className="ml-auto">
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          <DialogTrigger asChild>
                            <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setDetailAppointment(ocupant)}
                            title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>

                          {rowStatus === "SCHEDULED" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateStatus(ocupant.id, "COMPLETED")}
                                title="Marcar como concluído"
                              >
                                <Check className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateStatus(ocupant.id, "NO_SHOW")}
                                title="Paciente não compareceu"
                              >
                                <UserX className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCancelAppointment(ocupant.id)}
                                title="Cancelar consulta"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                          {rowStatus === "NO_SHOW" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdateStatus(ocupant.id, "SCHEDULED")}
                                title="Voltar para agendado"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCancelAppointment(ocupant.id)}
                                title="Cancelar consulta"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={slot}
                    className="flex items-center  py-2 border-t last:border-b"
                  >
                    <div className="w-16 text-sm font-semibold">{slot}</div>
                    <div className="flex-1 text-sm text-gray-500">
                      Disponível
                    </div>
                  </div>
                )
              })
            )}
          </ScrollArea>

          {!isLoading && offGridAppointments.length > 0 ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
              <p className="text-sm font-semibold text-amber-950">
                Agendamentos fora da grade de horários
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900">
                A lista acima só usa os horários cadastrados no seu perfil. Se um
                agendamento foi marcado para um horário que{" "}
                <strong>não existe nessa grade</strong>, ele fica oculto ali — mas
                continua no sistema e aparece nos relatórios. Ajuste a grade no perfil
                ou cancele/altere o horário da consulta.
              </p>
              <div className="mt-3 space-y-2">
                {offGridAppointments.map((ocupant) => {
                  const rowStatus = ocupant.status ?? "SCHEDULED"
                  return (
                    <div
                      key={ocupant.id}
                      className="flex flex-col gap-2 rounded-md border border-amber-200/80 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="text-sm">
                        <div className="font-semibold text-zinc-900">{ocupant.name}</div>
                        <div className="mt-1 text-xs text-zinc-600">
                          Horário: <span className="font-medium">{ocupant.time}</span> ·{" "}
                          {ocupant.service.name} ·{" "}
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(ocupant.service.price / 100)}
                        </div>
                        <div className="mt-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[rowStatus]}`}
                          >
                            {STATUS_LABELS[rowStatus]}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDetailAppointment(ocupant)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            Detalhes
                          </Button>
                        </DialogTrigger>
                        {rowStatus === "SCHEDULED" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(ocupant.id, "COMPLETED")}
                            >
                              Concluir
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(ocupant.id, "NO_SHOW")}
                            >
                              Faltou
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelAppointment(ocupant.id)}
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                        {rowStatus === "NO_SHOW" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(ocupant.id, "SCHEDULED")}
                            >
                              Voltar agendado
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelAppointment(ocupant.id)}
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <DialogAppointment 
         appointment={detailAppointment}
      />
    </Dialog>

    <Sheet
      open={summarySheetStatus !== null}
      onOpenChange={(open) => {
        if (!open) setSummarySheetStatus(null)
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {summarySheetStatus === "SCHEDULED"
              ? "Quem agendou neste dia"
              : summarySheetStatus
                ? `${STATUS_LABELS[summarySheetStatus]} neste dia`
                : ""}
          </SheetTitle>
          <SheetDescription>
            {summarySheetStatus === "SCHEDULED"
              ? "Pacientes com consulta ainda agendada. Toque em Detalhes para ver telefone e serviço."
              : "Lista dos agendamentos com este status. Use Detalhes para abrir a ficha completa."}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-3 -mr-1">
          {!summarySheetStatus ? null : summarySheetAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground px-1 py-2">
              Nenhum agendamento neste status.
            </p>
          ) : (
            <ul className="space-y-2 pb-4">
              {summarySheetAppointments.map((appt) => {
                const rowStatus = appt.status ?? "SCHEDULED"
                const onGrid = slotStartIndex(times, appt.time) !== -1
                return (
                  <li
                    key={appt.id}
                    className="rounded-lg border bg-card p-3 text-sm shadow-sm"
                  >
                    <div className="font-semibold text-zinc-900">{appt.name}</div>
                    <div className="mt-1 text-xs text-zinc-600">
                      <span className="font-medium text-zinc-800">{appt.time}</span>
                      {" · "}
                      {appt.service.name}
                      {" · "}
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(appt.service.price / 100)}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[rowStatus]}`}
                      >
                        {STATUS_LABELS[rowStatus]}
                      </span>
                      {!onGrid && rowStatus !== "CANCELED" ? (
                        <span className="text-[11px] text-amber-700">
                          fora da grade
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDetailAppointment(appt)
                          setIsDialogOpen(true)
                        }}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        Detalhes
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
    </>
  )
}
