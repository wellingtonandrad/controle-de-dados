"use client"

import type { Customer, Product } from "@/lib/generated/prisma"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createSale, sendQuoteByEmail } from "../_actions/sale-actions"
import { toast } from "sonner"
import { formatCentsToBrl, parseMoneyToCents } from "@/app/utils/convertCurrency"
import { Mail, MessageCircle, Plus, Send, Trash2 } from "lucide-react"

type LineDraft = {
  key: string
  productId: string
  quantity: string
  unitPrice: string
}

function newLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    productId: "",
    quantity: "1",
    unitPrice: "",
  }
}

function whatsappUrl(phoneRaw: string, text: string): string | null {
  const d = phoneRaw.replace(/\D/g, "")
  if (d.length < 10) return null
  const n = d.startsWith("55") ? d : `55${d}`
  if (n.length < 12) return null
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}

export function NovaVendaForm({
  products,
  customers,
}: {
  products: Product[]
  customers: Customer[]
}) {
  const router = useRouter()
  const [customerId, setCustomerId] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()])
  const [pending, setPending] = useState(false)
  const [submitMode, setSubmitMode] = useState<"DRAFT" | "CONFIRMED">("CONFIRMED")
  const [sendCustomerId, setSendCustomerId] = useState("")
  const [sendProductId, setSendProductId] = useState("")
  const [sendQuantity, setSendQuantity] = useState("1")
  const [sendUnitPrice, setSendUnitPrice] = useState("")
  const [sendChannel, setSendChannel] = useState<"WHATSAPP" | "EMAIL">("WHATSAPP")
  const [sendingQuote, setSendingQuote] = useState(false)

  const activeProducts = useMemo(
    () => products.filter((p) => p.active),
    [products],
  )

  function setLineProduct(key: string, productId: string) {
    const p = activeProducts.find((x) => x.id === productId)
    setLines((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row
        const unitPrice = p
          ? (p.priceCents / 100).toFixed(2).replace(".", ",")
          : ""
        return { ...row, productId, unitPrice }
      }),
    )
  }

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    )
  }

  const totalPreviewCents = useMemo(() => {
    let sum = 0
    for (const row of lines) {
      if (!row.productId || !row.unitPrice.trim()) continue
      try {
        const unit = parseMoneyToCents(row.unitPrice)
        const qty = Number.parseInt(row.quantity, 10)
        if (Number.isFinite(qty) && qty > 0) {
          sum += unit * qty
        }
      } catch {
        /* ignore preview */
      }
    }
    return sum
  }, [lines])

  const sendPreviewCents = useMemo(() => {
    try {
      const qty = Number.parseInt(sendQuantity, 10)
      if (!Number.isFinite(qty) || qty <= 0) return 0
      const unit = parseMoneyToCents(sendUnitPrice || "0")
      return qty * unit
    } catch {
      return 0
    }
  }, [sendQuantity, sendUnitPrice])

  function handleSelectSendProduct(productId: string) {
    setSendProductId(productId)
    const p = activeProducts.find((x) => x.id === productId)
    if (p) {
      setSendUnitPrice((p.priceCents / 100).toFixed(2).replace(".", ","))
    }
  }

  async function handleSendQuote() {
    const customer = customers.find((c) => c.id === sendCustomerId)
    const product = activeProducts.find((p) => p.id === sendProductId)
    const qty = Number.parseInt(sendQuantity, 10)
    if (!customer || !product) {
      toast.error("Selecione cliente e produto para enviar o orçamento")
      return
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Quantidade inválida")
      return
    }

    let unitCents: number
    try {
      unitCents = parseMoneyToCents(sendUnitPrice || "0")
    } catch {
      toast.error("Preço inválido")
      return
    }
    if (unitCents <= 0) {
      toast.error("Preço unitário deve ser maior que zero")
      return
    }

    const totalCents = qty * unitCents
    const message =
      `Olá, ${customer.name}!\n\n` +
      `Segue seu orçamento:\n` +
      `• Produto: ${product.name}\n` +
      `• Quantidade: ${qty}\n` +
      `• Preço unitário: ${formatCentsToBrl(unitCents)}\n` +
      `• Total: ${formatCentsToBrl(totalCents)}\n\n` +
      `Se tiver interesse, respondemos por aqui para confirmar seu pedido.`

    if (sendChannel === "EMAIL") {
      if (!customer.email?.trim()) {
        toast.error("Esse cliente não possui e-mail cadastrado")
        return
      }
      setSendingQuote(true)
      const res = await sendQuoteByEmail({
        customerId: customer.id,
        productId: product.id,
        quantity: qty,
        unitPriceCents: unitCents,
      })
      setSendingQuote(false)
      if (res.error) {
        toast.error(res.error)
        return
      }
      toast.success("E-mail enviado com sucesso")
      return
    }

    if (!customer.phone?.trim()) {
      toast.error("Esse cliente não possui telefone cadastrado")
      return
    }
    const url = whatsappUrl(customer.phone, message)
    if (!url) {
      toast.error("Telefone do cliente inválido para WhatsApp")
      return
    }
    window.open(url, "_blank")
    toast.success("WhatsApp aberto para envio")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const parsedLines: {
      productId: string
      quantity: number
      unitPriceCents: number
    }[] = []
    try {
      for (const row of lines) {
        if (!row.productId) continue
        const qty = Number.parseInt(row.quantity, 10)
        if (!Number.isFinite(qty) || qty < 1) {
          throw new Error("qty")
        }
        const unitPriceCents = parseMoneyToCents(row.unitPrice)
        parsedLines.push({ productId: row.productId, quantity: qty, unitPriceCents })
      }
    } catch {
      toast.error("Confira quantidades e preços (use formato 0,00 ou 0.00)")
      setPending(false)
      return
    }

    if (parsedLines.length === 0) {
      toast.error("Adicione pelo menos um produto")
      setPending(false)
      return
    }

    const res = await createSale({
      customerId: customerId || undefined,
      notes: notes || undefined,
      lines: parsedLines,
      status: submitMode,
    })
    setPending(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(submitMode === "DRAFT" ? "Orçamento salvo" : "Venda registrada")
    router.push("/dashboard/vendas")
    router.refresh()
  }

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Dados do pedido</CardTitle>
        <Button variant="outline" asChild size="sm">
          <Link href="/dashboard/vendas">Voltar à lista</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {activeProducts.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Cadastre produtos em{" "}
            <Link href="/dashboard/produtos" className="text-emerald-700 underline">
              Produtos
            </Link>{" "}
            antes de registrar vendas.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Cliente (opcional)</Label>
                <Select
                  value={customerId || "__none__"}
                  onValueChange={(v) =>
                    setCustomerId(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Consumidor final / sem cadastro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem cliente</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sale-notes">Observações</Label>
                <Input
                  id="sale-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Itens</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLines((prev) => [...prev, newLine()])}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Linha
                </Button>
              </div>

              <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
                {lines.map((row, idx) => (
                  <div
                    key={row.key}
                    className="grid gap-3 border-b border-zinc-200 pb-4 last:border-0 last:pb-0 sm:grid-cols-12"
                  >
                    <div className="sm:col-span-5">
                      <Label className="text-xs text-zinc-500">Produto #{idx + 1}</Label>
                      <Select
                        value={row.productId || undefined}
                        onValueChange={(v) => setLineProduct(row.key, v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeProducts.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} — {formatCentsToBrl(p.priceCents)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs text-zinc-500">Qtd</Label>
                      <Input
                        className="mt-1"
                        inputMode="numeric"
                        value={row.quantity}
                        onChange={(e) =>
                          updateLine(row.key, { quantity: e.target.value })
                        }
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <Label className="text-xs text-zinc-500">Preço unit. (R$)</Label>
                      <Input
                        className="mt-1"
                        value={row.unitPrice}
                        onChange={(e) =>
                          updateLine(row.key, { unitPrice: e.target.value })
                        }
                        placeholder="0,00"
                      />
                    </div>
                    <div className="flex items-end sm:col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-zinc-500"
                        disabled={lines.length <= 1}
                        onClick={() =>
                          setLines((prev) =>
                            prev.filter((l) => l.key !== row.key),
                          )
                        }
                        aria-label="Remover linha"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-700">
                Total previsto:{" "}
                <strong className="text-lg text-zinc-900">
                  {formatCentsToBrl(totalPreviewCents)}
                </strong>
              </p>
              <Button
                type="submit"
                variant="outline"
                disabled={pending || activeProducts.length === 0}
                onClick={() => setSubmitMode("DRAFT")}
              >
                Salvar orçamento
              </Button>
              <Button
                type="submit"
                disabled={pending || activeProducts.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500"
                onClick={() => setSubmitMode("CONFIRMED")}
              >
                Confirmar venda
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
    <Card className="border-emerald-200/70 bg-emerald-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-4 w-4 text-emerald-700" />
          Envio de orçamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={sendCustomerId || "__none__"} onValueChange={(v) => setSendCustomerId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Selecione</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Produto</Label>
            <Select value={sendProductId || "__none__"} onValueChange={(v) => handleSelectSendProduct(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Selecione</SelectItem>
                {activeProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input value={sendQuantity} onChange={(e) => setSendQuantity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Preço unitário (R$)</Label>
            <Input value={sendUnitPrice} onChange={(e) => setSendUnitPrice(e.target.value)} placeholder="0,00" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Canal de envio</Label>
            <Select value={sendChannel} onValueChange={(v) => setSendChannel(v as "WHATSAPP" | "EMAIL")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="EMAIL">E-mail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <p className="text-xs text-zinc-500">Total do orçamento</p>
            <p className="text-lg font-semibold text-zinc-900">{formatCentsToBrl(sendPreviewCents)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <p className="text-xs text-zinc-600">
            O botão abre uma mensagem pronta para envio no canal escolhido.
          </p>
          <Button type="button" className="gap-2" onClick={handleSendQuote} disabled={sendingQuote}>
            {sendChannel === "EMAIL" ? <Mail className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
            {sendingQuote ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}
