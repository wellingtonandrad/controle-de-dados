"use client"

import { Toaster } from "sonner"

export function SonnerToaster() {
  return (
    <Toaster
      duration={2500}
      position="bottom-center"
    />
  )
}
