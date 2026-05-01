import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function ErpPageHeader({
  title,
  description,
  actions,
  className,
  variant = "default",
}: {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
  /** `dark`: título e borda para páginas com fundo escuro (ex.: relatórios premium). */
  variant?: "default" | "dark"
}) {
  const isDark = variant === "dark"
  return (
    <div
      className={cn(
        "flex flex-col gap-4 pb-6 sm:flex-row sm:items-start sm:justify-between",
        isDark
          ? "border-b border-white/[0.08]"
          : "border-b border-slate-200/80",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <div>
          <h1
            className={cn(
              "text-2xl font-semibold tracking-tight",
              isDark ? "text-slate-50" : "text-slate-900",
            )}
          >
            {title}
          </h1>
          <div
            className={cn(
              "mt-2 h-0.5 w-10 rounded-full",
              isDark ? "bg-emerald-400/90" : "bg-emerald-500",
            )}
            aria-hidden
          />
        </div>
        {description ? (
          <p
            className={cn(
              "max-w-2xl text-sm leading-relaxed",
              isDark ? "text-slate-400" : "text-slate-600",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
