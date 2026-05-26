import { strFromU8, unzipSync } from "fflate"
import { DOMParser } from "@xmldom/xmldom"
import * as tj from "@mapbox/togeojson"
import type { FeatureCollection } from "geojson"

const MAX_KML_CHARS = 4_000_000
const MAX_FEATURES = 800

function isZip(buf: Uint8Array): boolean {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b
}

function extractKmlFromZip(buffer: Uint8Array): { text: string; entryName: string } {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(buffer)
  } catch {
    throw new Error("Não foi possível abrir o arquivo KMZ (ZIP inválido).")
  }

  const names = Object.keys(files)
  const kmlName = names.find((n) => n.toLowerCase().endsWith(".kml"))
  if (!kmlName) {
    throw new Error("Nenhum arquivo .kml encontrado dentro do KMZ.")
  }
  const raw = files[kmlName]
  if (!raw) throw new Error("Arquivo KML vazio no KMZ.")

  return { text: strFromU8(raw), entryName: kmlName }
}

function kmlTextToFeatureCollection(kmlText: string): { fc: FeatureCollection; truncated: boolean } {
  if (kmlText.length > MAX_KML_CHARS) {
    throw new Error("Arquivo KML muito grande (máximo ~4 MB de texto).")
  }

  const doc = new DOMParser().parseFromString(kmlText, "text/xml")
  const errs = doc.getElementsByTagName("parsererror")
  if (errs.length > 0) {
    throw new Error("XML/KML inválido ou corrompido.")
  }

  const fc = tj.kml(doc)
  if (!fc || fc.type !== "FeatureCollection") {
    throw new Error("Não foi possível converter o KML em mapa (GeoJSON).")
  }

  if (fc.features.length > MAX_FEATURES) {
    return {
      fc: { ...fc, features: fc.features.slice(0, MAX_FEATURES) },
      truncated: true,
    }
  }
  return { fc, truncated: false }
}

export type KmzParseResult = {
  geojson: FeatureCollection
  sourceFileName: string | null
  truncated: boolean
}

/** Aceita buffer de arquivo .kmz (ZIP) ou .kml (texto XML). */
export function kmzOrKmlToFeatureCollection(
  buffer: Uint8Array,
  originalFileName: string,
): KmzParseResult {
  const lower = originalFileName.toLowerCase()
  let kmlText: string
  let sourceFileName: string | null = originalFileName

  if (lower.endsWith(".kmz") || isZip(buffer)) {
    const { text, entryName } = extractKmlFromZip(buffer)
    kmlText = text
    sourceFileName = `${originalFileName} → ${entryName}`
  } else if (lower.endsWith(".kml")) {
    kmlText = new TextDecoder("utf-8").decode(buffer)
  } else {
    throw new Error("Envie um arquivo .kmz ou .kml.")
  }

  const { fc: geojson, truncated } = kmlTextToFeatureCollection(kmlText)
  if (geojson.features.length === 0) {
    throw new Error("O KML não contém geometrias reconhecidas (pastas vazias ou formato não suportado).")
  }

  return { geojson, sourceFileName, truncated }
}
