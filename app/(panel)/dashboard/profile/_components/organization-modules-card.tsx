"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import type { ErpVerticalModule } from "@/lib/generated/prisma"
import {
  ERP_MODULE_HINTS,
  ERP_MODULE_LABELS,
  ERP_MODULE_ORDER,
} from "@/lib/erp/vertical-modules"
import { updateOrganizationModules } from "../_actions/update-organization-modules"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Layers } from "lucide-react"

export function OrganizationModulesCard({
  organizationName,
  enabledModules,
}: {
  organizationName: string
  enabledModules: ErpVerticalModule[]
}) {
  const [selected, setSelected] = useState<ErpVerticalModule[]>(enabledModules)
  const [pending, startTransition] = useTransition()

  function toggle(module: ErpVerticalModule) {
    setSelected((prev) => {
      if (prev.includes(module)) {
        if (prev.length <= 1) {
          toast.error("Mantenha ao menos um módulo vertical ativo.")
          return prev
        }
        return prev.filter((m) => m !== module)
      }
      return [...prev, module]
    })
  }

  const dirty =
    selected.length !== enabledModules.length ||
    ERP_MODULE_ORDER.some((m) => selected.includes(m) !== enabledModules.includes(m))

  return (
    <Card className="mt-8 max-w-2xl">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
            <Layers className="size-5" aria-hidden />
          </span>
          <div>
            <CardTitle className="text-base">Módulos da empresa</CardTitle>
            <CardDescription className="mt-1 text-sm leading-relaxed">
              CORE (vendas, estoque, financeiro, cadastros) fica sempre disponível. Aqui você
              liga os setores plugáveis de <strong>{organizationName}</strong>.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {ERP_MODULE_ORDER.map((module) => {
            const on = selected.includes(module)
            return (
              <li key={module}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => toggle(module)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                    on
                      ? "border-emerald-200 bg-emerald-50/80 ring-1 ring-emerald-100"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border text-xs font-bold",
                      on
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-300 bg-white text-transparent",
                    )}
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {ERP_MODULE_LABELS[module]}
                      </span>
                      {on ? (
                        <Badge variant="success" className="font-normal">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-normal">
                          Desligado
                        </Badge>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {ERP_MODULE_HINTS[module]}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <Button
          type="button"
          disabled={pending || !dirty}
          onClick={() =>
            startTransition(async () => {
              const res = await updateOrganizationModules(selected)
              if ("error" in res) toast.error(res.error)
              else toast.success(res.data)
            })
          }
        >
          Salvar módulos
        </Button>
      </CardContent>
    </Card>
  )
}
