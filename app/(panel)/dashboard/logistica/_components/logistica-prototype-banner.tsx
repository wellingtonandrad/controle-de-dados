import { Info } from "lucide-react"

export function LogisticaPrototypeBanner() {
  return (
    <div
      className="flex gap-3 rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
      role="status"
    >
      <Info className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">Protótipo visual — operação por lote</p>
        <p className="text-xs leading-relaxed text-amber-900/90">
          As abas <strong>Lotes (escritório)</strong> e <strong>Coletor</strong> usam dados de
          exemplo. Nada é salvo no banco ainda: serve para validar fluxo e layout com o cliente.
          O ERP continuará enviando lotes reais para a operação na fase funcional.
        </p>
      </div>
    </div>
  )
}
