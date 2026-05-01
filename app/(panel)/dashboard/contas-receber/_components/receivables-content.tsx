"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ErpPageHeader } from "@/app/(panel)/dashboard/_components/erp-page-header"
import { formatCentsToBrl, parseMoneyToCents } from "@/app/utils/convertCurrency"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  markReceivablePaid,
  markReceivableUnpaid,
  createManualReceivable,
  sendReceivablesReminders,
} from "../_actions/receivable-actions"

type CustomerOption = {
  id: string
  name: string
}

type ReceivableRow = {
  id: string
  kind: "MANUAL" | "INSTALLMENT"
  sourceLabel: string
  customerName: string
  description: string
  amountCents: number
  dueDate: string
  paidAt: string | null
  notes: string | null
}

export function ReceivablesContent({
  customers,
  receivables,
}: {
  customers: CustomerOption[]
  receivables: ReceivableRow[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [customerId, setCustomerId] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [query, setQuery] = useState("")
  const [customerFilter, setCustomerFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "PAID">("ALL")
  const [dueFrom, setDueFrom] = useState("")
  const [dueTo, setDueTo] = useState("")
  const [sendingReminders, setSendingReminders] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return receivables.filter((r) => {
      if (customerFilter && r.customerName !== customerFilter) return false
      if (statusFilter === "OPEN" && r.paidAt) return false
      if (statusFilter === "PAID" && !r.paidAt) return false
      if (q) {
        const hay = `${r.description} ${r.customerName} ${r.sourceLabel} ${r.notes ?? ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      const dueTime = new Date(r.dueDate).getTime()
      if (dueFrom) {
        const start = new Date(`${dueFrom}T00:00:00`).getTime()
        if (Number.isFinite(start) && dueTime < start) return false
      }
      if (dueTo) {
        const end = new Date(`${dueTo}T23:59:59`).getTime()
        if (Number.isFinite(end) && dueTime > end) return false
      }
      return true
    })
  }, [receivables, query, customerFilter, statusFilter, dueFrom, dueTo])

  const openCount = filtered.filter((r) => !r.paidAt).length
  const openTotal = filtered.filter((r) => !r.paidAt).reduce((s, r) => s + r.amountCents, 0)

  async function submitNewReceivable() {
    let amountCents = 0
    try {
      amountCents = parseMoneyToCents(amount)
    } catch {
      toast.error("Valor inválido. Use 0,00")
      return
    }
    if (!dueDate) {
      toast.error("Informe a data de vencimento")
      return
    }
    setPending(true)
    const res = await createManualReceivable({
      customerId: customerId || undefined,
      description,
      amountCents,
      dueDate,
      notes: notes || undefined,
    })
    setPending(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success("Conta a receber cadastrada")
    setCustomerId("")
    setDescription("")
    setAmount("")
    setDueDate("")
    setNotes("")
    setOpen(false)
  }

  async function togglePaid(row: ReceivableRow) {
    setPending(true)
    const res = row.paidAt
      ? await markReceivableUnpaid({ kind: row.kind, id: row.id })
      : await markReceivablePaid({ kind: row.kind, id: row.id })
    setPending(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(row.paidAt ? "Conta marcada como em aberto" : "Conta marcada como recebida")
  }

  async function handleSendReminders() {
    setSendingReminders(true)
    const res = await sendReceivablesReminders()
    setSendingReminders(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(`Lembretes enviados: ${"sent" in res ? res.sent : 0}`)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ErpPageHeader
        title="Contas a receber"
        description="Acompanhe tudo que a empresa ainda tem para receber e registre novas contas manuais."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={sendingReminders}
              onClick={() => void handleSendReminders()}
            >
              Enviar lembretes automáticos
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>+ Nova conta a receber</Button>
              </DialogTrigger>
              <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova conta a receber</DialogTitle>
                <DialogDescription>
                  Cadastre uma conta manual para controle financeiro da empresa.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Cliente (opcional)</Label>
                  <select
                    className="h-10 w-full rounded-md border px-3 text-sm"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                  >
                    <option value="">Sem cliente</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Descrição</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: cobrança recorrente mensal" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Valor (R$)</Label>
                    <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
                  </div>
                  <div className="space-y-1">
                    <Label>Vencimento</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Observações</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" disabled={pending} onClick={() => void submitNewReceivable()}>
                  Cadastrar
                </Button>
              </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Em aberto</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total a receber</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{formatCentsToBrl(openTotal)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lista de contas</CardTitle>
            <CardDescription>Grupo repetidor com todas as contas a receber da empresa.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 rounded-lg border bg-slate-50/60 p-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1 xl:col-span-2">
              <Label>Busca</Label>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Descrição, cliente, origem..." />
            </div>
            <div className="space-y-1">
              <Label>Cliente</Label>
              <select className="h-10 w-full rounded-md border px-3 text-sm" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
                <option value="">Todos</option>
                {[...new Set(receivables.map((r) => r.customerName))].sort((a, b) => a.localeCompare(b, "pt-BR")).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select className="h-10 w-full rounded-md border px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | "OPEN" | "PAID")}>
                <option value="ALL">Todos</option>
                <option value="OPEN">Em aberto</option>
                <option value="PAID">Recebidas</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Vencimento de</Label>
              <Input type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>até</Label>
              <Input type="date" value={dueTo} onChange={(e) => setDueTo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("")
                  setCustomerFilter("")
                  setStatusFilter("ALL")
                  setDueFrom("")
                  setDueTo("")
                }}
              >
                Limpar filtros
              </Button>
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-slate-500">
              Nenhuma conta encontrada.
            </p>
          ) : (
            filtered.map((row) => (
              <div key={`${row.kind}-${row.id}`} className="rounded-lg border bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{row.description}</p>
                    <p className="text-xs text-slate-500">
                      {row.customerName} · venc. {new Date(row.dueDate).toLocaleDateString("pt-BR")} · {row.sourceLabel}
                    </p>
                    {row.notes ? <p className="text-xs text-slate-500">{row.notes}</p> : null}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-slate-900">{formatCentsToBrl(row.amountCents)}</p>
                    {row.paidAt ? (
                      <Badge variant="success">Recebida</Badge>
                    ) : (
                      <Badge variant="warning">Em aberto</Badge>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant={row.paidAt ? "outline" : "default"}
                    disabled={pending}
                    onClick={() => void togglePaid(row)}
                  >
                    {row.paidAt ? "Marcar em aberto" : "Marcar recebida"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

