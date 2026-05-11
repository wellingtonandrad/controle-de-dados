"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ErpPageHeader } from "@/app/(panel)/dashboard/_components/erp-page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  bootstrapRbacDefaults,
  createAccountGroup,
  getEmployees,
  toggleMemberGroup,
  updateGroupPermissions,
} from "../_actions/account-groups-actions"

type PermissionRow = { key: string; label: string }
type GroupRow = {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  permissionKeys: string[]
}
type MemberRow = {
  id: string
  name: string
  email: string
  role: "OWNER" | "MANAGER" | "STAFF"
  groupIds: string[]
}

export function AccountGroupsContent({
  permissions,
  groups,
  members,
}: {
  permissions: PermissionRow[]
  groups: GroupRow[]
  members: MemberRow[]
}) {
  const router = useRouter()
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDescription, setNewGroupDescription] = useState("")
  const [newPerms, setNewPerms] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const [memberSearchInput, setMemberSearchInput] = useState("")
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState("")
  const [displayedMembers, setDisplayedMembers] = useState<MemberRow[]>(members)
  const [membersLoading, setMembersLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedMemberSearch(memberSearchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [memberSearchInput])

  useEffect(() => {
    if (!debouncedMemberSearch) {
      setDisplayedMembers(members)
      setMembersLoading(false)
      return
    }

    let cancelled = false
    setMembersLoading(true)
    void getEmployees({ query: debouncedMemberSearch, page: 1, pageSize: 200 }).then((res) => {
      if (cancelled) return
      setMembersLoading(false)
      if ("error" in res && res.error) {
        toast.error(res.error)
        return
      }
      if (res.ok) setDisplayedMembers(res.data.items)
    })
    return () => {
      cancelled = true
    }
  }, [debouncedMemberSearch, members])

  const sortedPermissions = useMemo(
    () => [...permissions].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    [permissions],
  )

  function toggleArrayValue(current: string[], key: string) {
    if (current.includes(key)) return current.filter((k) => k !== key)
    return [...current, key]
  }

  async function handleCreateGroup() {
    setSaving(true)
    const result = await createAccountGroup({
      name: newGroupName,
      description: newGroupDescription || undefined,
      permissionKeys: newPerms as never[],
    })
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Cargo criado.")
    setNewGroupName("")
    setNewGroupDescription("")
    setNewPerms([])
    router.refresh()
  }

  async function handleBootstrap() {
    setSaving(true)
    const result = await bootstrapRbacDefaults()
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Cargos padrão sincronizados.")
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ErpPageHeader
        title="Cargos e permissões"
        description="Defina grupos de acesso e vincule membros por cargo para controlar módulos do ERP."
        actions={
          <Button variant="outline" disabled={saving} onClick={() => void handleBootstrap()}>
            Recriar cargos padrão
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo cargo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Nome do cargo"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <Input
              placeholder="Descrição (opcional)"
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {sortedPermissions.map((perm) => (
              <label
                key={perm.key}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={newPerms.includes(perm.key)}
                  onChange={() => setNewPerms((prev) => toggleArrayValue(prev, perm.key))}
                />
                <span>{perm.label}</span>
              </label>
            ))}
          </div>
          <Button disabled={saving} onClick={() => void handleCreateGroup()}>
            Criar cargo
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {group.name}
                {group.isSystem ? " (padrão)" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.description ? (
                <p className="text-sm text-slate-600">{group.description}</p>
              ) : null}
              <div className="grid gap-2 md:grid-cols-2">
                {sortedPermissions.map((perm) => {
                  const checked = group.permissionKeys.includes(perm.key)
                  return (
                    <label
                      key={`${group.id}-${perm.key}`}
                      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={async () => {
                          setSaving(true)
                          const next = checked
                            ? group.permissionKeys.filter((k) => k !== perm.key)
                            : [...group.permissionKeys, perm.key]
                          const result = await updateGroupPermissions({
                            groupId: group.id,
                            permissionKeys: next as never[],
                          })
                          setSaving(false)
                          if (result.error) {
                            toast.error(result.error)
                          } else {
                            toast.success("Permissões atualizadas.")
                            router.refresh()
                          }
                        }}
                      />
                      <span>{perm.label}</span>
                    </label>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Membros por cargo</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Input
              className="max-w-md"
              placeholder="Buscar por nome ou e-mail…"
              value={memberSearchInput}
              onChange={(e) => setMemberSearchInput(e.target.value)}
              disabled={saving}
              aria-busy={membersLoading}
            />
            <p className="text-xs text-slate-500">
              {membersLoading
                ? "Buscando…"
                : debouncedMemberSearch
                  ? `${displayedMembers.length} resultado(s)`
                  : `${displayedMembers.length} membro(s)`}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {displayedMembers.length === 0 && !membersLoading ? (
            <p className="text-sm text-slate-600">
              {debouncedMemberSearch
                ? "Nenhum membro encontrado para esta busca."
                : "Nenhum membro nesta empresa."}
            </p>
          ) : null}
          {displayedMembers.map((member) => (
            <div key={member.id} className="rounded-lg border p-3">
              <p className="font-medium text-slate-900">{member.name}</p>
              <p className="text-xs text-slate-500">{member.email} · {member.role}</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {groups.map((group) => {
                  const checked = member.groupIds.includes(group.id)
                  return (
                    <label
                      key={`${member.id}-${group.id}`}
                      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={async () => {
                          setSaving(true)
                          const result = await toggleMemberGroup({
                            memberId: member.id,
                            groupId: group.id,
                            enabled: !checked,
                          })
                          setSaving(false)
                          if (result.error) {
                            toast.error(result.error)
                          } else {
                            router.refresh()
                          }
                        }}
                      />
                      <span>{group.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

