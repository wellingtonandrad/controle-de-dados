import Link from "next/link"
import { cn } from "@/lib/utils"

export function LegalFooterLinks({ className }: { className?: string }) {
  return (
    <nav
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground",
        className,
      )}
      aria-label="Documentos legais"
    >
      <Link href="/termos" className="underline-offset-4 hover:text-foreground hover:underline">
        Termos de uso
      </Link>
      <span className="text-zinc-300 select-none" aria-hidden>
        ·
      </span>
      <Link
        href="/privacidade"
        className="underline-offset-4 hover:text-foreground hover:underline"
      >
        Privacidade
      </Link>
    </nav>
  )
}
