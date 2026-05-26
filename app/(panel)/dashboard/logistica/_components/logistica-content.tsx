"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ErpPageHeader } from "@/app/(panel)/dashboard/_components/erp-page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GeoMapPreview } from "@/components/logistics/geo-map-preview"
import { cn } from "@/lib/utils"
import {
  addGpsTrackPoint,
  createDeliveryTrip,
  createGeoMapLayerFromUpload,
  deleteDeliveryTrip,
  deleteGeoMapLayer,
  setDeliveryTripStatus,
} from "../_actions/logistics-actions"
import { MapPin, Radio, Trash2, Truck } from "lucide-react"
import { erpTableHead, erpTableWrap } from "@/lib/erp-shell"

const CATEGORY_LABEL: Record<string, string> = {
  DELIVERY_REGION: "Região de entrega",
  FACTORY_SITE: "Área da fábrica / unidade",
  NEIGHBORHOOD_BOUNDARY: "Limite de bairro / zona",
  PLANNED_ROUTE: "Rota planejada",
}

const TRIP_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Em andamento",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
}

const PROGRESS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendada",
  LOADING: "Carregando",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  IN_TRANSIT: "Em trânsito",
  AT_CUSTOMER: "No cliente",
  DELIVERED: "Entregue",
  EXCEPTION: "Exceção / problema",
  RETURNING: "Retornando",
  CANCELLED: "Cancelada",
}

const SUBJECT_LABEL: Record<string, string> = {
  DELIVERER: "Entregador",
  COMPANY_VEHICLE: "Veículo da empresa",
}

function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export type GeoLayerDto = {
  id: string
  name: string
  category: string
  geoJson: unknown
  sourceFileName: string | null
  createdAt: string
  updatedAt: string
}

export type GpsPointDto = {
  id: string
  latitude: number
  longitude: number
  recordedAt: string
  subject: string
  deliveryStatus: string
  note: string | null
  createdAt: string
}

export type TripDto = {
  id: string
  referenceCode: string | null
  description: string | null
  driverLabel: string | null
  vehicleLabel: string | null
  status: string
  saleId: string | null
  createdAt: string
  updatedAt: string
  gpsPoints: GpsPointDto[]
  sale: { id: string; totalCents: number; customerName: string | null } | null
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function LogisticaContent({
  layers,
  trips,
  saleOptions,
  embedded = false,
}: {
  layers: GeoLayerDto[]
  trips: TripDto[]
  saleOptions: { id: string; label: string }[]
  /** Oculta cabeçalho da página quando embutido no hub de logística. */
  embedded?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [section, setSection] = useState<"layers" | "deliveries">("layers")
  const [selectedTripId, setSelectedTripId] = useState<string>(trips[0]?.id ?? "")

  const [layerName, setLayerName] = useState("")
  const [layerCategory, setLayerCategory] = useState<string>("DELIVERY_REGION")

  const [tripRef, setTripRef] = useState("")
  const [tripDesc, setTripDesc] = useState("")
  const [tripDriver, setTripDriver] = useState("")
  const [tripVehicle, setTripVehicle] = useState("")
  const [tripSaleId, setTripSaleId] = useState("")

  const [gpsLat, setGpsLat] = useState("")
  const [gpsLng, setGpsLng] = useState("")
  const [gpsWhen, setGpsWhen] = useState(() => toDatetimeLocalValue(new Date()))
  const [gpsSubject, setGpsSubject] = useState<"DELIVERER" | "COMPANY_VEHICLE">("DELIVERER")
  const [gpsProgress, setGpsProgress] = useState<string>("IN_TRANSIT")
  const [gpsNote, setGpsNote] = useState("")

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) ?? null,
    [trips, selectedTripId],
  )

  const mapTrackPoints = useMemo(() => {
    const pts = selectedTrip?.gpsPoints ?? []
    const tail = pts.length > 400 ? pts.slice(-400) : pts
    return tail.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      recordedAt: p.recordedAt,
      subject: p.subject as "DELIVERER" | "COMPANY_VEHICLE",
      deliveryStatus: PROGRESS_LABEL[p.deliveryStatus] ?? p.deliveryStatus,
    }))
  }, [selectedTrip])

  const mapLayers = useMemo(
    () => layers.map((l) => ({ id: l.id, geoJson: l.geoJson })),
    [layers],
  )

  const layersStamp = useMemo(() => layers.map((l) => `${l.id}:${l.updatedAt}`).join("|"), [layers])

  const trackStamp = useMemo(() => {
    if (!selectedTrip) return ""
    return `${selectedTrip.id}:${selectedTrip.gpsPoints.map((p) => p.id).join(",")}`
  }, [selectedTrip])

  function refresh() {
    router.refresh()
  }

  return (
    <div className={embedded ? "space-y-8" : "mx-auto max-w-7xl space-y-8 pb-10"}>
      {!embedded ? (
        <ErpPageHeader
          title="Logística e mapas"
          description="Camadas geográficas (KMZ/KML) para regiões, fábricas e rotas; entregas com histórico de GPS (entregador ou veículo), horário e status."
          actions={
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href="#mapa-operacional">
                <MapPin className="size-4" aria-hidden />
                Ir ao mapa
              </a>
            </Button>
          }
        />
      ) : null}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-sm">
        <Button
          type="button"
          variant={section === "layers" ? "default" : "ghost"}
          className="gap-2 rounded-xl"
          onClick={() => setSection("layers")}
        >
          <MapPin className="size-4" aria-hidden />
          Camadas (KMZ / KML)
        </Button>
        <Button
          type="button"
          variant={section === "deliveries" ? "default" : "ghost"}
          className="gap-2 rounded-xl"
          onClick={() => setSection("deliveries")}
        >
          <Truck className="size-4" aria-hidden />
          Entregas e GPS
        </Button>
      </div>

      <div id="mapa-operacional" className="grid gap-6 xl:grid-cols-5">
        <Card className="overflow-hidden rounded-2xl border-slate-200/90 py-0 shadow-md xl:col-span-3">
          <CardHeader className="border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
            <CardTitle className="text-base">Mapa operacional</CardTitle>
            <CardDescription className="text-sm">
              {section === "layers"
                ? "Visualização das camadas cadastradas."
                : selectedTrip
                  ? `Rastro da entrega selecionada (${selectedTrip.gpsPoints.length} ponto(s)) sobre as camadas.`
                  : "Selecione ou crie uma entrega para ver o rastro de GPS."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <GeoMapPreview
              layers={mapLayers}
              trackPoints={mapTrackPoints}
              layersStamp={layersStamp}
              trackStamp={trackStamp}
            />
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Mapas © OpenStreetMap — use zoom e arraste para explorar.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-5 xl:col-span-2">
          {section === "layers" ? (
            <>
              <Card className="rounded-2xl border-slate-200/90 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Nova camada geográfica</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    Importe um arquivo <strong>.kmz</strong> (Google Earth) ou <strong>.kml</strong>. O sistema
                    converte para mapa; escolha o tipo para organizar (entrega, fábrica, bairro, rota).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="layer-name">Nome da camada</Label>
                    <Input
                      id="layer-name"
                      value={layerName}
                      onChange={(e) => setLayerName(e.target.value)}
                      placeholder="Ex.: Zona Sul — entregas"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="layer-cat">Tipo</Label>
                    <select
                      id="layer-cat"
                      className={selectClass}
                      value={layerCategory}
                      onChange={(e) => setLayerCategory(e.target.value)}
                    >
                      {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="layer-file">Arquivo KMZ ou KML</Label>
                    <Input
                      id="layer-file"
                      name="file"
                      type="file"
                      accept=".kmz,.kml,application/vnd.google-earth.kmz,application/xml,text/xml"
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={pending || !layerName.trim()}
                    onClick={() => {
                      const input = document.getElementById("layer-file") as HTMLInputElement | null
                      const file = input?.files?.[0]
                      if (!file) {
                        toast.error("Selecione um arquivo .kmz ou .kml.")
                        return
                      }
                      const fd = new FormData()
                      fd.set("name", layerName.trim())
                      fd.set("category", layerCategory)
                      fd.set("file", file)
                      startTransition(async () => {
                        const res = await createGeoMapLayerFromUpload(fd)
                        if ("error" in res) toast.error(res.error)
                        else {
                          toast.success(res.data)
                          setLayerName("")
                          if (input) input.value = ""
                          refresh()
                        }
                      })
                    }}
                  >
                    Importar camada
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200/90 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Camadas cadastradas</CardTitle>
                  <CardDescription className="text-xs">
                    {layers.length === 0 ? "Nenhuma camada ainda." : `${layers.length} camada(s).`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className={erpTableWrap}>
                    <table className="w-full min-w-[280px] text-sm">
                      <thead>
                        <tr className={erpTableHead}>
                          <th className="px-3 py-2 text-left">Nome</th>
                          <th className="px-2 py-2 text-left">Tipo</th>
                          <th className="px-2 py-2 text-right"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        {layers.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                              Importe um KMZ/KML para ver regiões no mapa ao lado.
                            </td>
                          </tr>
                        ) : (
                          layers.map((row) => (
                            <tr key={row.id} className="border-b border-slate-100 last:border-0">
                              <td className="px-3 py-2 font-medium text-slate-900">{row.name}</td>
                              <td className="px-2 py-2 text-xs text-muted-foreground">
                                {CATEGORY_LABEL[row.category] ?? row.category}
                              </td>
                              <td className="px-2 py-2 text-right">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-destructive"
                                  disabled={pending}
                                  onClick={() =>
                                    startTransition(async () => {
                                      const res = await deleteGeoMapLayer(row.id)
                                      if ("error" in res) toast.error(res.error)
                                      else {
                                        toast.success(res.data)
                                        refresh()
                                      }
                                    })
                                  }
                                >
                                  <Trash2 className="size-4" aria-hidden />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="rounded-2xl border-slate-200/90 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Nova entrega / rota</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    Cadastre uma entrega para associar pontos de GPS. Opcionalmente vincule a um pedido de venda.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="trip-ref">Código de referência</Label>
                    <Input
                      id="trip-ref"
                      value={tripRef}
                      onChange={(e) => setTripRef(e.target.value)}
                      placeholder="Ex.: ENT-1042"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="trip-desc">Descrição / cliente</Label>
                    <Input
                      id="trip-desc"
                      value={tripDesc}
                      onChange={(e) => setTripDesc(e.target.value)}
                      placeholder="Ex.: Entrega loja Centro"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="trip-driver">Entregador</Label>
                      <Input
                        id="trip-driver"
                        value={tripDriver}
                        onChange={(e) => setTripDriver(e.target.value)}
                        placeholder="Nome"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="trip-veh">Veículo</Label>
                      <Input
                        id="trip-veh"
                        value={tripVehicle}
                        onChange={(e) => setTripVehicle(e.target.value)}
                        placeholder="Placa / frota"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="trip-sale">Pedido (venda) — opcional</Label>
                    <select
                      id="trip-sale"
                      className={selectClass}
                      value={tripSaleId}
                      onChange={(e) => setTripSaleId(e.target.value)}
                    >
                      <option value="">Não vincular</option>
                      {saleOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    className="w-full gap-2"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await createDeliveryTrip({
                          referenceCode: tripRef || undefined,
                          description: tripDesc || undefined,
                          driverLabel: tripDriver || undefined,
                          vehicleLabel: tripVehicle || undefined,
                          saleId: tripSaleId || undefined,
                        })
                        if ("error" in res) toast.error(res.error)
                        else {
                          toast.success("Entrega criada.")
                          setSelectedTripId(res.data)
                          setTripRef("")
                          setTripDesc("")
                          setTripDriver("")
                          setTripVehicle("")
                          setTripSaleId("")
                          refresh()
                        }
                      })
                    }
                  >
                    <Truck className="size-4" aria-hidden />
                    Criar entrega
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200/90 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Entregas</CardTitle>
                  <CardDescription className="text-xs">Selecione para ver no mapa e lançar GPS.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <select
                    className={selectClass}
                    value={selectedTripId}
                    onChange={(e) => setSelectedTripId(e.target.value)}
                  >
                    <option value="">— Selecione —</option>
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {(t.referenceCode || `…${t.id.slice(-6)}`) +
                          ` · ${TRIP_STATUS_LABEL[t.status] ?? t.status}`}
                      </option>
                    ))}
                  </select>

                  {selectedTrip ? (
                    <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{TRIP_STATUS_LABEL[selectedTrip.status] ?? selectedTrip.status}</Badge>
                        {selectedTrip.sale ? (
                          <span className="text-muted-foreground">
                            Pedido: {selectedTrip.sale.customerName ?? "—"} · …{selectedTrip.sale.id.slice(-6)}
                          </span>
                        ) : null}
                      </div>
                      {selectedTrip.driverLabel ? (
                        <p>
                          <span className="font-medium text-slate-800">Entregador:</span> {selectedTrip.driverLabel}
                        </p>
                      ) : null}
                      {selectedTrip.vehicleLabel ? (
                        <p>
                          <span className="font-medium text-slate-800">Veículo:</span> {selectedTrip.vehicleLabel}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="text-muted-foreground">Alterar status:</span>
                        {(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"] as const).map((st) => (
                          <Button
                            key={st}
                            type="button"
                            size="sm"
                            variant={selectedTrip.status === st ? "default" : "outline"}
                            className="h-7 text-xs"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                const res = await setDeliveryTripStatus({ tripId: selectedTrip.id, status: st })
                                if ("error" in res) toast.error(res.error)
                                else {
                                  toast.success(res.data)
                                  refresh()
                                }
                              })
                            }
                          >
                            {TRIP_STATUS_LABEL[st]}
                          </Button>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive hover:text-destructive"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm("Remover esta entrega e todo o histórico de GPS?")) return
                          startTransition(async () => {
                            const res = await deleteDeliveryTrip(selectedTrip.id)
                            if ("error" in res) toast.error(res.error)
                            else {
                              toast.success(res.data)
                              setSelectedTripId(trips.filter((x) => x.id !== selectedTrip.id)[0]?.id ?? "")
                              refresh()
                            }
                          })
                        }}
                      >
                        Excluir entrega
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Crie uma entrega acima ou selecione na lista.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-emerald-900/10 bg-emerald-50/30 shadow-sm ring-1 ring-emerald-100/80">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Radio className="size-4 text-emerald-800" aria-hidden />
                    Registrar ponto de GPS
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    Latitude, longitude, data/hora e status da entrega. Origem: entregador ou veículo da empresa.
                    No futuro, o mesmo registro poderá vir do app do motorista em tempo real.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="gps-lat">Latitude</Label>
                      <Input
                        id="gps-lat"
                        inputMode="decimal"
                        value={gpsLat}
                        onChange={(e) => setGpsLat(e.target.value)}
                        placeholder="-23.55"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="gps-lng">Longitude</Label>
                      <Input
                        id="gps-lng"
                        inputMode="decimal"
                        value={gpsLng}
                        onChange={(e) => setGpsLng(e.target.value)}
                        placeholder="-46.63"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gps-when">Data e hora do ponto</Label>
                    <Input
                      id="gps-when"
                      type="datetime-local"
                      value={gpsWhen}
                      onChange={(e) => setGpsWhen(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="gps-sub">Origem</Label>
                      <select
                        id="gps-sub"
                        className={selectClass}
                        value={gpsSubject}
                        onChange={(e) => setGpsSubject(e.target.value as "DELIVERER" | "COMPANY_VEHICLE")}
                      >
                        <option value="DELIVERER">{SUBJECT_LABEL.DELIVERER}</option>
                        <option value="COMPANY_VEHICLE">{SUBJECT_LABEL.COMPANY_VEHICLE}</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="gps-prog">Status da entrega</Label>
                      <select
                        id="gps-prog"
                        className={selectClass}
                        value={gpsProgress}
                        onChange={(e) => setGpsProgress(e.target.value)}
                      >
                        {Object.entries(PROGRESS_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gps-note">Observação (opcional)</Label>
                    <Input
                      id="gps-note"
                      value={gpsNote}
                      onChange={(e) => setGpsNote(e.target.value)}
                      placeholder="Ex.: aguardando portaria"
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={pending || !selectedTrip}
                    onClick={() => {
                      if (!selectedTrip) return
                      const lat = Number(gpsLat.replace(",", "."))
                      const lng = Number(gpsLng.replace(",", "."))
                      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                        toast.error("Informe latitude e longitude numéricas.")
                        return
                      }
                      const recordedAt = new Date(gpsWhen)
                      if (Number.isNaN(recordedAt.getTime())) {
                        toast.error("Data/hora inválida.")
                        return
                      }
                      startTransition(async () => {
                        const res = await addGpsTrackPoint({
                          tripId: selectedTrip.id,
                          latitude: lat,
                          longitude: lng,
                          recordedAt: recordedAt.toISOString(),
                          subject: gpsSubject,
                          deliveryStatus: gpsProgress as
                            | "SCHEDULED"
                            | "LOADING"
                            | "OUT_FOR_DELIVERY"
                            | "IN_TRANSIT"
                            | "AT_CUSTOMER"
                            | "DELIVERED"
                            | "EXCEPTION"
                            | "RETURNING"
                            | "CANCELLED",
                          note: gpsNote || undefined,
                        })
                        if ("error" in res) toast.error(res.error)
                        else {
                          toast.success(res.data)
                          setGpsNote("")
                          setGpsWhen(toDatetimeLocalValue(new Date()))
                          refresh()
                        }
                      })
                    }}
                  >
                    Salvar ponto
                  </Button>
                </CardContent>
              </Card>

              {selectedTrip && selectedTrip.gpsPoints.length > 0 ? (
                <Card className="rounded-2xl border-slate-200/90 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Histórico de pontos</CardTitle>
                    <CardDescription className="text-xs">Últimos registros (mais recentes primeiro).</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className={cn(erpTableWrap, "max-h-64")}>
                      <table className="w-full min-w-[320px] text-xs">
                        <thead>
                          <tr className={erpTableHead}>
                            <th className="px-2 py-2 text-left">Quando</th>
                            <th className="px-2 py-2 text-left">Status</th>
                            <th className="px-2 py-2 text-left">Origem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...selectedTrip.gpsPoints]
                            .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
                            .slice(0, 25)
                            .map((p) => (
                              <tr key={p.id} className="border-b border-slate-100">
                                <td className="px-2 py-1.5 text-muted-foreground">
                                  {new Date(p.recordedAt).toLocaleString("pt-BR")}
                                </td>
                                <td className="px-2 py-1.5">{PROGRESS_LABEL[p.deliveryStatus] ?? p.deliveryStatus}</td>
                                <td className="px-2 py-1.5">{SUBJECT_LABEL[p.subject] ?? p.subject}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
