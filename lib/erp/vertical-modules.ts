import type { ErpVerticalModule } from "@/lib/generated/prisma"

export const ERP_MODULE_LABELS: Record<ErpVerticalModule, string> = {
  LOGISTICS: "Logística",
  MARKETS: "Mercados",
  SERVICES: "Serviços",
  HOSPITALS: "Hospitais",
  INDUSTRY: "Indústria",
}

export const ERP_MODULE_HINTS: Record<ErpVerticalModule, string> = {
  LOGISTICS: "Frota, entregas, rotas e GPS (KMZ).",
  MARKETS: "PDV, estoque de loja e compras (piloto).",
  SERVICES: "Agenda pública, serviços e equipe de atendimento.",
  HOSPITALS: "Agenda clínica, prontuário e leitos (em evolução).",
  INDUSTRY: "Engenharia, produção e necessidades (MRP).",
}

/** Ordem de exibição nas configurações. */
export const ERP_MODULE_ORDER: ErpVerticalModule[] = [
  "LOGISTICS",
  "MARKETS",
  "SERVICES",
  "HOSPITALS",
  "INDUSTRY",
]

/** Módulos sugeridos para empresas novas (piloto multissetorial). */
export const DEFAULT_ENABLED_MODULES: ErpVerticalModule[] = [
  "LOGISTICS",
  "SERVICES",
  "INDUSTRY",
]

export function hasErpModule(
  enabled: ErpVerticalModule[] | undefined | null,
  module: ErpVerticalModule,
): boolean {
  if (!enabled || enabled.length === 0) return true
  return enabled.includes(module)
}

export function normalizeEnabledModules(
  enabled: ErpVerticalModule[] | undefined | null,
): ErpVerticalModule[] {
  if (!enabled || enabled.length === 0) return [...DEFAULT_ENABLED_MODULES]
  return enabled
}
