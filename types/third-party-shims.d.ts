declare module "leaflet/dist/leaflet.css"

declare module "@mapbox/togeojson" {
  import type { FeatureCollection } from "geojson"

  /** Converte um documento KML (DOM) em GeoJSON FeatureCollection. */
  export function kml(doc: unknown): FeatureCollection
}
