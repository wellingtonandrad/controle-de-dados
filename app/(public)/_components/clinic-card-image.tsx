"use client"

import { useState } from "react"

function initialsFromName(name: string | null | undefined): string {
  const n = name?.trim()
  if (!n) return "?"
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  const a = parts[0][0]
  const b = parts[parts.length - 1][0]
  return `${a}${b}`.toUpperCase()
}

export function ClinicCardImage({
  imageUrl,
  name,
}: {
  imageUrl: string | null | undefined
  name: string | null | undefined
}) {
  const [failed, setFailed] = useState(false)
  const initials = initialsFromName(name)

  if (!imageUrl || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-50 text-3xl font-semibold tracking-wide text-emerald-900/80">
        {initials}
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt=""
      className="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}
