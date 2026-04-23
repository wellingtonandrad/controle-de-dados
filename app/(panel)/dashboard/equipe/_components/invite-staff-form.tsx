"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { inviteClinicStaff } from "../_actions/invite-clinic-staff"
import { toast } from "sonner"

export function InviteStaffForm() {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"RECEPTION" | "DENTIST">("RECEPTION")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await inviteClinicStaff({ email, role })
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(res.data ?? "Salvo")
    setEmail("")
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border bg-white p-4 shadow-sm"
    >
      <h2 className="text-lg font-medium">Adicionar à equipe</h2>
      <div className="space-y-2">
        <Label htmlFor="staff-email">E-mail da pessoa (conta já criada no site)</Label>
        <Input
          id="staff-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="recepcao@clinica.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Papel</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={role === "RECEPTION" ? "default" : "outline"}
            className="flex-1 sm:flex-none"
            onClick={() => setRole("RECEPTION")}
          >
            Recepção
          </Button>
          <Button
            type="button"
            variant={role === "DENTIST" ? "default" : "outline"}
            className="flex-1 sm:flex-none"
            onClick={() => setRole("DENTIST")}
          >
            Doutor(a)
          </Button>
        </div>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Salvando…" : "Adicionar"}
      </Button>
    </form>
  )
}
