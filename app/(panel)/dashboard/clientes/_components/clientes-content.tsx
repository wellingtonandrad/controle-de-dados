"use client"

import type { Customer } from "@/lib/generated/prisma"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ErpPageHeader } from "@/app/(panel)/dashboard/_components/erp-page-header"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createCustomer,
  setCustomerActive,
  updateCustomer,
} from "../_actions/customer-actions"
import { toast } from "sonner"
import { Search } from "lucide-react"
import { formatCentsToBrl } from "@/app/utils/convertCurrency"

function normalizeSearch(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

type CustomerWithHistory = Customer & {
  history: {
    salesCount: number
    totalCents: number
    lastSaleAt: Date | null
  }
}

function digitsOnly(value?: string | null) {
  return (value ?? "").replace(/\D/g, "")
}

export function ClientesContent({ customers }: { customers: CustomerWithHistory[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [pending, setPending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [document, setDocument] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [notes, setNotes] = useState("")

  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editDocument, setEditDocument] = useState("")
  const [editAddress, setEditAddress] = useState("")
  const [editCity, setEditCity] = useState("")
  const [editState, setEditState] = useState("")
  const [editPostalCode, setEditPostalCode] = useState("")
  const [editNotes, setEditNotes] = useState("")

  const filtered = useMemo(() => {
    const q = normalizeSearch(query)
    if (!q) return customers
    return customers.filter((c) => {
      const hay = normalizeSearch(
        `${c.name} ${c.email ?? ""} ${c.phone ?? ""} ${c.document ?? ""}`,
      )
      return hay.includes(q)
    })
  }, [customers, query])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await createCustomer({
      name,
      email: email || undefined,
      phone: phone || undefined,
      document: document || undefined,
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      postalCode: postalCode || undefined,
      notes: notes || undefined,
    })
    setPending(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success("Cliente cadastrado")
    router.refresh()
    setName("")
    setEmail("")
    setPhone("")
    setDocument("")
    setAddress("")
    setCity("")
    setState("")
    setPostalCode("")
    setNotes("")
  }

  async function toggleActive(c: Customer) {
    const res = await setCustomerActive(c.id, !c.active)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(c.active ? "Cliente inativado" : "Cliente reativado")
    router.refresh()
  }

  function startEdit(c: CustomerWithHistory) {
    setEditingId(c.id)
    setEditName(c.name)
    setEditEmail(c.email ?? "")
    setEditPhone(c.phone ?? "")
    setEditDocument(c.document ?? "")
    setEditAddress(c.address ?? "")
    setEditCity(c.city ?? "")
    setEditState(c.state ?? "")
    setEditPostalCode(c.postalCode ?? "")
    setEditNotes(c.notes ?? "")
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleUpdate() {
    if (!editingId) return
    setPending(true)
    const res = await updateCustomer({
      id: editingId,
      name: editName,
      email: editEmail || undefined,
      phone: editPhone || undefined,
      document: editDocument || undefined,
      address: editAddress || undefined,
      city: editCity || undefined,
      state: editState || undefined,
      postalCode: editPostalCode || undefined,
      notes: editNotes || undefined,
    })
    setPending(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success("Cliente atualizado")
    setEditingId(null)
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <ErpPageHeader
        title="Clientes"
        description="Cadastro de clientes da empresa para vendas e contato."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Novo cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="c-name">Nome *</Label>
                <Input
                  id="c-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Razão social ou nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-email">E-mail</Label>
                <Input
                  id="c-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-phone">Telefone</Label>
                <Input
                  id="c-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-doc">CPF / CNPJ</Label>
                <Input
                  id="c-doc"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="c-address">Endereço</Label>
                <Input
                  id="c-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-city">Cidade</Label>
                <Input
                  id="c-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-state">UF</Label>
                <Input
                  id="c-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  maxLength={2}
                  placeholder="SP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-cep">CEP</Label>
                <Input
                  id="c-cep"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="c-notes">Observações</Label>
                <Input
                  id="c-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={pending || !name.trim()}>
              Salvar cliente
            </Button>
          </form>
        </CardContent>
      </Card>

      {editingId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Editar cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ec-name">Nome *</Label>
                <Input id="ec-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ec-email">E-mail</Label>
                <Input id="ec-email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ec-phone">Telefone</Label>
                <Input id="ec-phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ec-doc">CPF / CNPJ</Label>
                <Input id="ec-doc" value={editDocument} onChange={(e) => setEditDocument(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ec-address">Endereço</Label>
                <Input id="ec-address" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ec-city">Cidade</Label>
                <Input id="ec-city" value={editCity} onChange={(e) => setEditCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ec-state">UF</Label>
                <Input id="ec-state" value={editState} onChange={(e) => setEditState(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ec-cep">CEP</Label>
                <Input id="ec-cep" value={editPostalCode} onChange={(e) => setEditPostalCode(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ec-notes">Observações</Label>
                <Input id="ec-notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={handleUpdate} disabled={pending || !editName.trim()}>
                Salvar edição
              </Button>
              <Button type="button" variant="outline" onClick={cancelEdit}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div>
        <div className="relative mb-4 max-w-md">
          <Label htmlFor="client-search" className="sr-only">
            Buscar
          </Label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            id="client-search"
            type="search"
            placeholder="Buscar por nome, e-mail, telefone ou documento…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoComplete="off"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-12 text-center text-sm text-zinc-600">
            {customers.length === 0
              ? "Nenhum cliente cadastrado ainda."
              : "Nenhum resultado para a busca."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-zinc-50 text-xs font-medium uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Histórico</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Cidade</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className={c.active ? "" : "bg-zinc-50/80 text-zinc-500"}
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {c.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {c.email ? (
                          <span className="text-zinc-700">{c.email}</span>
                        ) : null}
                        {c.phone ? (
                          <span className="text-zinc-600">{c.phone}</span>
                        ) : null}
                        {!c.email && !c.phone ? "—" : null}
                        <div className="mt-1 flex gap-2 text-xs">
                          {c.email ? (
                            <a className="text-blue-700 underline" href={`mailto:${c.email}`}>
                              E-mail
                            </a>
                          ) : null}
                          {c.phone ? (
                            <a className="text-blue-700 underline" href={`tel:${digitsOnly(c.phone)}`}>
                              Ligar
                            </a>
                          ) : null}
                          {c.phone ? (
                            <a
                              className="text-emerald-700 underline"
                              href={`https://wa.me/55${digitsOnly(c.phone)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              WhatsApp
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 text-xs text-zinc-600">
                        <span>{c.history.salesCount} venda(s)</span>
                        <span>{formatCentsToBrl(c.history.totalCents)}</span>
                        <span>
                          {c.history.lastSaleAt
                            ? `Última: ${new Date(c.history.lastSaleAt).toLocaleDateString("pt-BR")}`
                            : "Sem compras"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{c.document ?? "—"}</td>
                    <td className="px-4 py-3">
                      {c.city ? `${c.city}${c.state ? ` / ${c.state}` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {c.active ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          Ativo
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(c)}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(c)}
                        >
                          {c.active ? "Inativar" : "Reativar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
