import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  Boxes,
  CalendarCheck2,
  Contact,
  Package,
  ShoppingCart,
} from "lucide-react"

const modules = [
  {
    title: "Clientes",
    description: "Cadastro e histórico por empresa, com dados de contato e observações.",
    icon: Contact,
  },
  {
    title: "Produtos",
    description: "SKU, preço de venda e custo para controle comercial consistente.",
    icon: Package,
  },
  {
    title: "Vendas",
    description: "Pedidos com itens, totais e status para acompanhar o faturamento.",
    icon: ShoppingCart,
  },
  {
    title: "Estoque",
    description: "Materiais, movimentações e consumo vinculado à operação.",
    icon: Boxes,
  },
  {
    title: "Agenda e serviços",
    description: "Agendamentos e serviços no contexto da sua organização.",
    icon: CalendarCheck2,
  },
  {
    title: "Relatórios",
    description: "Visão de receita, fluxo e desempenho por período.",
    icon: BarChart3,
  },
] as const

export function Hero() {
  return (
    <>
      <section className="border-b border-zinc-100 bg-white pt-28 pb-16">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              ERP multi-empresa
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
              Gestão operacional e comercial em um só lugar
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-zinc-600">
              Controle de dados centraliza clientes, produtos, vendas, estoque e
              rotina da empresa com acesso por organização e painel administrativo
              seguro.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                className="bg-emerald-600 px-6 font-semibold hover:bg-emerald-500"
              >
                <Link href="/#recursos">Ver módulos</Link>
              </Button>
              <Button asChild variant="outline" className="font-medium">
                <Link href="/acesso-empresa">Acessar o sistema</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="recursos"
        className="scroll-mt-24 bg-zinc-50 py-16 sm:py-20"
        aria-labelledby="recursos-heading"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              id="recursos-heading"
              className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl"
            >
              O que o painel oferece
            </h2>
            <p className="mt-3 text-zinc-600">
              Módulos pensados para o dia a dia de quem precisa de ERP enxuto,
              sem perder o foco na operação.
            </p>
          </div>

          <ul className="mx-auto mt-12 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ title, description, icon: Icon }) => (
              <li
                key={title}
                className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold text-zinc-900">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
