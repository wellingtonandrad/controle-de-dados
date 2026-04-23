"use client"

import { useMemo, useState } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight, Search } from "lucide-react"
import { Prisma } from "@/lib/generated/prisma"
import { PremiumCarBadge } from "./premium-badge"
import { ClinicCardImage } from "./clinic-card-image"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

type UserWithSubscription = Prisma.UserGetPayload<{
  include: {
    subscription: true
  }
}>

function normalizeSearch(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

interface ProfessionalsClientProps {
  professionals: UserWithSubscription[]
}

export function ProfessionalsClient({ professionals }: ProfessionalsClientProps) {
  const [query, setQuery] = useState("")
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "recent">("name-asc")

  const filtered = useMemo(() => {
    let list = [...professionals]
    const q = normalizeSearch(query)
    if (q) {
      list = list.filter((p) => {
        const hay = normalizeSearch(
          `${p.name ?? ""} ${p.address ?? ""} ${p.email ?? ""}`,
        )
        return hay.includes(q)
      })
    }

    if (sortBy === "name-asc") {
      list.sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "", "pt-BR", {
          sensitivity: "base",
        }),
      )
    } else if (sortBy === "name-desc") {
      list.sort((a, b) =>
        (b.name ?? "").localeCompare(a.name ?? "", "pt-BR", {
          sensitivity: "base",
        }),
      )
    } else {
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    }

    return list
  }, [professionals, query, sortBy])

  return (
    <section id="profissionais" className="scroll-mt-24 bg-gray-50 py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
            Clínicas para agendar
          </h2>
          <p className="mt-2 text-sm text-zinc-600 sm:text-base">
            Profissionais verificados. Use a busca por nome, e-mail ou endereço
            e escolha onde marcar sua consulta.
          </p>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Label htmlFor="clinic-search" className="sr-only">
              Buscar clínica
            </Label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              id="clinic-search"
              type="search"
              placeholder="Buscar por nome, endereço ou e-mail…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoComplete="off"
            />
          </div>
          <div className="flex w-full flex-col gap-1 sm:w-56">
            <Label htmlFor="clinic-sort" className="text-xs text-zinc-500">
              Ordenar
            </Label>
            <Select
              value={sortBy}
              onValueChange={(v) =>
                setSortBy(v as "name-asc" | "name-desc" | "recent")
              }
            >
              <SelectTrigger id="clinic-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Nome (A–Z)</SelectItem>
                <SelectItem value="name-desc">Nome (Z–A)</SelectItem>
                <SelectItem value="recent">Mais recentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-16 text-center">
            <p className="text-lg font-medium text-zinc-800">
              {professionals.length === 0
                ? "Nenhuma clínica disponível no momento"
                : "Nenhum resultado para sua busca"}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              {professionals.length === 0
                ? "Volte em breve ou entre em contato com o suporte."
                : "Tente outro termo ou limpe o campo de busca."}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((clinic) => (
              <li key={clinic.id} className="h-full">
                <Card className="flex h-full flex-col overflow-hidden border-zinc-200/80 shadow-sm transition-shadow duration-300 hover:shadow-md">
                  <CardContent className="flex flex-1 flex-col p-0">
                    <div className="relative h-48 w-full shrink-0 overflow-hidden bg-zinc-100">
                      <ClinicCardImage
                        imageUrl={clinic.image}
                        name={clinic.name}
                      />
                      {clinic?.subscription?.status === "active" &&
                        clinic?.subscription?.plan === "PROFESSIONAL" && (
                          <PremiumCarBadge />
                        )}
                    </div>

                    <div className="flex flex-1 flex-col gap-4 p-4">
                      <div className="min-h-0 flex-1 space-y-1">
                        <h3 className="line-clamp-2 font-semibold leading-snug text-zinc-900">
                          {clinic.name ?? "Clínica"}
                        </h3>
                        <p className="line-clamp-3 text-sm leading-relaxed text-zinc-500">
                          {clinic.address?.trim()
                            ? clinic.address
                            : "Endereço não informado"}
                        </p>
                      </div>

                      <Link
                        href={`/clinica/${clinic.id}`}
                        className="mt-auto flex w-full items-center justify-center rounded-md bg-emerald-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-400 md:text-base"
                      >
                        Agendar horário
                        <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
