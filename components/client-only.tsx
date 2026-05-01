"use client"

import { useEffect, useState, type ReactNode } from "react"

/**
 * Evita mismatch de hidratação em primitivos Radix (ex.: Sheet) quando o HTML
 * depende de estado só disponível após o mount (sessão, etc.).
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) return fallback
  return children
}
