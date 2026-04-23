import { getServicePerformance } from "../../reports/_data_access/get-permission-report"
import Link from "next/link"

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100)
}

interface ServicesInsightsProps {
  userId: string
}

export async function ServicesInsights({ userId }: ServicesInsightsProps) {
  const metrics = await getServicePerformance({ userId, period: "month" })

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <article className="rounded-lg border bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Mais lucrativo</p>
        <p className="mt-2 text-base font-semibold text-zinc-900">
          {metrics.topService?.name ?? "Sem dados"}
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          {metrics.topService
            ? `${formatCurrency(metrics.topService.estimatedRevenue)} · ${metrics.topService.completedCount} concluídas`
            : "Marque consultas como concluídas para ver receita"}
        </p>
      </article>

      <article className="rounded-lg border bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Mais vendido</p>
        <p className="mt-2 text-base font-semibold text-zinc-900">
          {metrics.mostSoldService?.name ?? "Sem dados"}
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          {metrics.mostSoldService
            ? `${metrics.mostSoldService.completedCount} concluídas · ${metrics.mostSoldService.appointmentsCount} na agenda`
            : "Sem dados no período"}
        </p>
      </article>
      </div>

      <div className="flex justify-end">
        <Link
          href="/dashboard/reports?period=month"
          className="rounded-md border px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          Ver relatório completo
        </Link>
      </div>
    </section>
  )
}
