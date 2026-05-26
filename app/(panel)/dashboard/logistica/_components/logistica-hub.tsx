"use client"

import { useState } from "react"
import { ErpPageHeader } from "@/app/(panel)/dashboard/_components/erp-page-header"
import { cn } from "@/lib/utils"
import { ClipboardList, MapPin, Smartphone } from "lucide-react"
import { LogisticaPrototypeBanner } from "./logistica-prototype-banner"
import {
  LogisticaContent,
  type GeoLayerDto,
  type TripDto,
} from "./logistica-content"
import { LotesEscritorioPrototype } from "./lotes-escritorio-prototype"
import { ColetorPrototype } from "./coletor-prototype"

type HubTab = "mapa" | "lotes" | "coletor"

const TABS: { id: HubTab; label: string; icon: typeof MapPin }[] = [
  { id: "mapa", label: "Mapa e entregas", icon: MapPin },
  { id: "lotes", label: "Lotes (escritório)", icon: ClipboardList },
  { id: "coletor", label: "Coletor", icon: Smartphone },
]

export function LogisticaHub({
  layers,
  trips,
  saleOptions,
  collectorDisplayName,
}: {
  layers: GeoLayerDto[]
  trips: TripDto[]
  saleOptions: { id: string; label: string }[]
  collectorDisplayName: string
}) {
  const [tab, setTab] = useState<HubTab>("mapa")

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <ErpPageHeader
        title="Logística"
        description="Mapas e entregas (funcional) · Lotes e coleta na operação (protótipo visual para validar fluxo ERP → chão de fábrica)."
      />

      <nav
        className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-sm"
        aria-label="Áreas da logística"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition",
              tab === id
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </button>
        ))}
      </nav>

      {tab !== "mapa" ? <LogisticaPrototypeBanner /> : null}

      {tab === "mapa" ? (
        <LogisticaContent
          embedded
          layers={layers}
          trips={trips}
          saleOptions={saleOptions}
        />
      ) : null}
      {tab === "lotes" ? <LotesEscritorioPrototype /> : null}
      {tab === "coletor" ? <ColetorPrototype displayName={collectorDisplayName} /> : null}
    </div>
  )
}
