/** Dados fictícios para protótipo visual — operação de coleta por lote (sem persistência). */

export type LotStatus = "LIBERADO" | "EM_COLETA" | "FINALIZADO"

export type MockLotItem = {
  id: string
  sku: string
  productName: string
  quantityPlanned: number
  quantityCollected: number
  collected: boolean
}

export type MockOperationLot = {
  id: string
  code: string
  status: LotStatus
  totalItems: number
  collectedCount: number
  collectorName: string | null
  startedAt: string | null
  finishedAt: string | null
  notes: string | null
  items: MockLotItem[]
}

export const MOCK_OPERATION_LOTS: MockOperationLot[] = [
  {
    id: "lot-7003",
    code: "7003",
    status: "FINALIZADO",
    totalItems: 32,
    collectedCount: 32,
    collectorName: "Ana Souza",
    startedAt: "2026-05-19T07:12:00",
    finishedAt: "2026-05-19T09:48:00",
    notes: "Conferido sem divergência.",
    items: [],
  },
  {
    id: "lot-7004",
    code: "7004",
    status: "EM_COLETA",
    totalItems: 40,
    collectedCount: 17,
    collectorName: "Carlos Lima",
    startedAt: "2026-05-19T10:05:00",
    finishedAt: null,
    notes: null,
    items: [
      { id: "i1", sku: "MP-8841", productName: "Embalagem 500ml", quantityPlanned: 120, quantityCollected: 120, collected: true },
      { id: "i2", sku: "MP-2209", productName: "Tampa rosqueável", quantityPlanned: 120, quantityCollected: 120, collected: true },
      { id: "i3", sku: "PA-1092", productName: "Kit promocional A", quantityPlanned: 40, quantityCollected: 0, collected: false },
      { id: "i4", sku: "PA-1093", productName: "Kit promocional B", quantityPlanned: 40, quantityCollected: 0, collected: false },
    ],
  },
  {
    id: "lot-7005",
    code: "7005",
    status: "LIBERADO",
    totalItems: 40,
    collectedCount: 0,
    collectorName: null,
    startedAt: null,
    finishedAt: null,
    notes: "Liberado pelo escritório — aguardando coletor.",
    items: Array.from({ length: 6 }, (_, n) => ({
      id: `7005-${n}`,
      sku: `SKU-${7005}-${n + 1}`,
      productName: `Produto linha ${n + 1}`,
      quantityPlanned: 10 + n,
      quantityCollected: 0,
      collected: false,
    })),
  },
  {
    id: "lot-7006",
    code: "7006",
    status: "LIBERADO",
    totalItems: 28,
    collectedCount: 0,
    collectorName: null,
    startedAt: null,
    finishedAt: null,
    notes: null,
    items: [],
  },
]

export const LOT_STATUS_LABEL: Record<LotStatus, string> = {
  LIBERADO: "Liberado para coleta",
  EM_COLETA: "Em coleta",
  FINALIZADO: "Finalizado",
}

export function formatLotProgress(collected: number, total: number) {
  return `${collected}/${total}`
}

export function suggestNextLotCode(lots: { code: string }[]) {
  const nums = lots
    .map((l) => parseInt(l.code.replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n))
  const next = nums.length ? Math.max(...nums) + 1 : 7001
  return String(next)
}
