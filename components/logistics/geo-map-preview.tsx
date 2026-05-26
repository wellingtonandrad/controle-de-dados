"use client"

import type { FeatureCollection } from "geojson"
import { useEffect, useRef } from "react"
import type { Map as LeafletMap } from "leaflet"

export type TrackPointForMap = {
  latitude: number
  longitude: number
  recordedAt: string
  subject: "DELIVERER" | "COMPANY_VEHICLE"
  deliveryStatus: string
}

type LayerForMap = { id: string; geoJson: unknown }

export function GeoMapPreview({
  layers,
  trackPoints,
  layersStamp,
  trackStamp,
}: {
  layers: LayerForMap[]
  trackPoints: TrackPointForMap[]
  /** Muda quando o GeoJSON da camada é atualizado (ex.: mesmo id, novo conteúdo). */
  layersStamp: string
  trackStamp: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    let cancelled = false

    const run = async () => {
      const L = (await import("leaflet")).default
      await import("leaflet/dist/leaflet.css")

      if (cancelled || !wrapRef.current) return

      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      const map = L.map(el, { scrollWheelZoom: false }).setView([-14.2, -51.9], 4)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map)

      const group = L.featureGroup()

      for (const layer of layers) {
        const gj = layer.geoJson as FeatureCollection
        if (gj?.type === "FeatureCollection" && Array.isArray(gj.features) && gj.features.length > 0) {
          L.geoJSON(gj as never, {
            style: {
              color: "#059669",
              weight: 2,
              opacity: 0.8,
              fillOpacity: 0.1,
            },
          }).addTo(group)
        }
      }

      const sorted = [...trackPoints].sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
      )
      if (sorted.length >= 2) {
        const latlngs = sorted.map((p) => [p.latitude, p.longitude] as [number, number])
        L.polyline(latlngs, { color: "#2563eb", weight: 3, opacity: 0.85 }).addTo(group)
      }

      sorted.forEach((p) => {
        const color = p.subject === "DELIVERER" ? "#1d4ed8" : "#c2410c"
        L.circleMarker([p.latitude, p.longitude], {
          radius: 6,
          color,
          weight: 2,
          fillColor: "#fff",
          fillOpacity: 1,
        })
          .bindTooltip(
            `${new Date(p.recordedAt).toLocaleString("pt-BR")}<br/>${p.deliveryStatus} · ${
              p.subject === "DELIVERER" ? "Entregador" : "Veículo empresa"
            }`,
            { sticky: true, direction: "top" },
          )
          .addTo(group)
      })

      group.addTo(map)
      if (group.getBounds().isValid()) {
        map.fitBounds(group.getBounds().pad(0.12))
      } else {
        map.setView([-14.2, -51.9], 4)
      }

      mapRef.current = map
    }

    void run()

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [layersStamp, trackStamp, layers, trackPoints])

  return (
    <div
      ref={wrapRef}
      className="h-[min(420px,55vh)] min-h-[280px] w-full rounded-xl border border-slate-200 bg-slate-100"
    />
  )
}
