/** Chave yyyy-MM-dd do dia civil em UTC (alinhado ao armazenamento `Date.UTC` da consulta). */
export function utcCalendarDateKey(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d
  const y = x.getUTCFullYear()
  const m = String(x.getUTCMonth() + 1).padStart(2, "0")
  const day = String(x.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
