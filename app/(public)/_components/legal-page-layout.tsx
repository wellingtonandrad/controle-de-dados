import Link from "next/link"
import type { ReactNode } from "react"

export function LegalPageLayout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 sm:px-6">
      <article className="mx-auto max-w-3xl rounded-xl border bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
        <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
          Texto modelo para apoio à transparência. Revise com assessoria jurídica
          antes de uso formal com clientes e empresas.
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {title}
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-zinc-700 sm:text-[15px] [&_h2]:mt-8 [&_h2]:scroll-mt-20 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-zinc-900 [&_h2:first-of-type]:mt-6 [&_ul]:ml-5 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1.5">
          {children}
        </div>
        <p className="mt-10 text-sm text-muted-foreground">
          <Link href="/" className="font-medium text-emerald-700 underline-offset-4 hover:underline">
            Voltar ao início
          </Link>
        </p>
      </article>
    </main>
  )
}
