"use client"

import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { utcCalendarDateKey } from "@/app/utils/utc-calendar-date-key"
import {
  createInstallmentStripeCheckout,
  saveAppointmentInstallmentPlan,
  setInstallmentPaid,
  setInstallmentUnpaid,
} from "../../_actions/appointment-installments"

type InstallmentRow = {
  id: string
  sequence: number
  amountCents: number
  dueDate: string
  paidAt: string | null
}

function splitCents(total: number, n: number): number[] {
  if (n <= 0) return []
  const base = Math.floor(total / n)
  const rem = total % n
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0))
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
  dt.setUTCDate(dt.getUTCDate() + days)
  return utcCalendarDateKey(dt)
}

function formatBrl(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100)
}

interface AppointmentInstallmentsEditorProps {
  appointmentId: string
  servicePriceCents: number
  appointmentDate: string | Date
  status: string | null | undefined
}

export function AppointmentInstallmentsEditor({
  appointmentId,
  servicePriceCents,
  appointmentDate,
  status,
}: AppointmentInstallmentsEditorProps) {
  const queryClient = useQueryClient()
  const [parcelCount, setParcelCount] = useState("3")
  const [busy, setBusy] = useState(false)

  const baseYmd = useMemo(
    () => utcCalendarDateKey(new Date(appointmentDate)),
    [appointmentDate],
  )

  const { data: rows = [], refetch } = useQuery({
    queryKey: ["appointment-installments", appointmentId],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/panel/appointments/${appointmentId}/installments`,
      )
      if (!res.ok) return [] as InstallmentRow[]
      return res.json() as Promise<InstallmentRow[]>
    },
    enabled: status === "COMPLETED",
  })

  if (status !== "COMPLETED") {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Parcelamento e caixa ficam disponíveis após marcar a consulta como{" "}
        <strong>Concluída</strong>.
      </p>
    )
  }

  async function invalidate() {
    await refetch()
    queryClient.invalidateQueries({ queryKey: ["reports-dashboard"] })
    queryClient.invalidateQueries({ queryKey: ["get-appointments"] })
    queryClient.invalidateQueries({ queryKey: ["completed-recent"] })
  }

  async function applyEqualPlan() {
    const n = Number(parcelCount)
    if (!Number.isFinite(n) || n < 1 || n > 24) {
      toast.error("Use entre 1 e 24 parcelas.")
      return
    }
    const parts = splitCents(servicePriceCents, n)
    const installments = parts.map((amountCents, i) => ({
      amountCents,
      dueDate: addDaysYmd(baseYmd, 30 * i),
      paidAt: null as string | null,
    }))
    setBusy(true)
    const res = await saveAppointmentInstallmentPlan({
      appointmentId,
      installments,
    })
    setBusy(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(res.data ?? "Parcelas salvas.")
    await invalidate()
  }

  async function restoreSinglePaid() {
    const nowIso = new Date().toISOString()
    setBusy(true)
    const res = await saveAppointmentInstallmentPlan({
      appointmentId,
      installments: [
        {
          amountCents: servicePriceCents,
          dueDate: baseYmd,
          paidAt: nowIso,
        },
      ],
    })
    setBusy(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success("Voltou para pagamento único (marcado como recebido).")
    await invalidate()
  }

  async function onTogglePaid(row: InstallmentRow) {
    setBusy(true)
    const res = row.paidAt
      ? await setInstallmentUnpaid(row.id)
      : await setInstallmentPaid(row.id)
    setBusy(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(res.data ?? "Atualizado.")
    await invalidate()
  }

  async function onStripeCheckout(row: InstallmentRow) {
    setBusy(true)
    const res = await createInstallmentStripeCheckout(row.id)
    setBusy(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    if (!res.url) {
      toast.error("Stripe não retornou URL de checkout.")
      return
    }
    window.location.href = res.url
  }

  return (
    <section className="mt-4 rounded-md border border-zinc-200 bg-zinc-50/80 p-3">
      <p className="text-sm font-semibold text-zinc-900">Pagamento e parcelas</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        O valor do serviço continua na <strong>receita reconhecida</strong> quando a
        consulta é concluída. Aqui você controla <strong>quanto entrou no caixa</strong>{" "}
        (parcelas pagas) e o que ainda está <strong>a receber</strong>.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1">
          <Label className="text-xs">Parcelas iguais</Label>
          <Select value={parcelCount} onValueChange={setParcelCount}>
            <SelectTrigger className="h-9 w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((n) => (
                <SelectItem key={n} value={n}>
                  {n}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void applyEqualPlan()}
        >
          Gerar plano (venc. a cada 30 dias)
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void restoreSinglePaid()}
        >
          1x à vista (pago)
        </Button>
      </div>

      <ul className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <li className="text-xs text-muted-foreground">Carregando parcelas…</li>
        ) : (
          rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-1 rounded border bg-white px-2 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="font-semibold text-zinc-900">
                  {row.sequence}ª — {formatBrl(row.amountCents)}
                </span>
                <span className="text-zinc-600">
                  {" "}
                  · venc.{" "}
                  {format(new Date(row.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                {row.paidAt ? (
                  <span className="ml-1 text-emerald-700">
                    · recebido em{" "}
                    {format(new Date(row.paidAt), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                ) : (
                  <span className="ml-1 text-amber-700">· em aberto</span>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                {!row.paidAt ? (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="h-8 bg-indigo-600 hover:bg-indigo-700"
                    disabled={busy}
                    onClick={() => void onStripeCheckout(row)}
                  >
                    Pagar com Stripe
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={busy}
                  onClick={() => void onTogglePaid(row)}
                >
                  {row.paidAt ? "Marcar em aberto" : "Registrar recebimento"}
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
