"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getActiveOrganizationId } from "@/app/utils/auth/organization-context"
import {
  ensureRbacDefaults,
  hasOrganizationPermission,
  PERMISSIONS,
  type PermissionKey,
} from "@/app/utils/auth/rbac"

async function getRbacContext() {
  const session = await auth()
  if (!session?.user?.id) return { error: "Não autorizado." } as const
  const organizationId = getActiveOrganizationId(session)
  if (!organizationId) return { error: "Empresa não identificada." } as const
  const canManage = await hasOrganizationPermission({
    session,
    organizationId,
    permission: "rbac:manage",
  })
  if (!canManage) return { error: "Sem permissão para gerir cargos." } as const
  return { session, organizationId } as const
}

const getEmployeesSchema = z.object({
  query: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(100),
})

export async function getPermissions() {
  const ctx = await getRbacContext()
  if ("error" in ctx) return { error: ctx.error } as const

  const permissions = await prisma.permission.findMany({
    where: { key: { in: PERMISSIONS.map((p) => p.key) } },
    select: { key: true, label: true },
    orderBy: { label: "asc" },
  })

  return {
    ok: true as const,
    data: permissions,
  }
}

export async function getEmployees(raw?: z.input<typeof getEmployeesSchema>) {
  const ctx = await getRbacContext()
  if ("error" in ctx) return { error: ctx.error } as const

  const parsed = getEmployeesSchema.safeParse(raw ?? {})
  if (!parsed.success) return { error: "Parâmetros inválidos." } as const

  const { query, page, pageSize } = parsed.data
  const where = {
    organizationId: ctx.organizationId,
    ...(query
      ? {
          OR: [
            { user: { name: { contains: query, mode: "insensitive" as const } } },
            { user: { email: { contains: query, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  }

  const [total, members] = await Promise.all([
    prisma.organizationMember.count({ where }),
    prisma.organizationMember.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        accountGroups: { select: { accountGroupId: true } },
      },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    ok: true as const,
    data: {
      items: members.map((m) => ({
        id: m.id,
        name: m.user.name ?? "Sem nome",
        email: m.user.email ?? "-",
        role: m.role,
        groupIds: m.accountGroups.map((g) => g.accountGroupId),
      })),
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }
}

const createGroupSchema = z.object({
  name: z.string().trim().min(2, "Nome do cargo é obrigatório"),
  description: z.string().trim().optional(),
  permissionKeys: z.array(z.enum(PERMISSIONS.map((p) => p.key) as [PermissionKey, ...PermissionKey[]])),
})

export async function createAccountGroup(raw: z.infer<typeof createGroupSchema>) {
  const ctx = await getRbacContext()
  if ("error" in ctx) return { error: ctx.error }
  const parsed = createGroupSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  const permissions = await prisma.permission.findMany({
    where: { key: { in: parsed.data.permissionKeys } },
    select: { id: true },
  })

  try {
    const group = await prisma.accountGroup.create({
      data: {
        organizationId: ctx.organizationId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        isSystem: false,
      },
      select: { id: true },
    })

    if (permissions.length > 0) {
      await prisma.accountGroupPermission.createMany({
        data: permissions.map((p) => ({ groupId: group.id, permissionId: p.id })),
        skipDuplicates: true,
      })
    }
    revalidatePath("/dashboard/cargos")
    return { ok: true as const }
  } catch {
    return { error: "Não foi possível criar o cargo." }
  }
}

const updateGroupSchema = z.object({
  groupId: z.string().min(1),
  permissionKeys: z.array(z.enum(PERMISSIONS.map((p) => p.key) as [PermissionKey, ...PermissionKey[]])),
})

export async function updateGroupPermissions(raw: z.infer<typeof updateGroupSchema>) {
  const ctx = await getRbacContext()
  if ("error" in ctx) return { error: ctx.error }
  const parsed = updateGroupSchema.safeParse(raw)
  if (!parsed.success) return { error: "Dados inválidos." }

  const group = await prisma.accountGroup.findFirst({
    where: { id: parsed.data.groupId, organizationId: ctx.organizationId },
    select: { id: true },
  })
  if (!group) return { error: "Cargo não encontrado." }

  const permissions = await prisma.permission.findMany({
    where: { key: { in: parsed.data.permissionKeys } },
    select: { id: true },
  })

  await prisma.accountGroupPermission.deleteMany({ where: { groupId: group.id } })
  if (permissions.length > 0) {
    await prisma.accountGroupPermission.createMany({
      data: permissions.map((p) => ({ groupId: group.id, permissionId: p.id })),
      skipDuplicates: true,
    })
  }
  revalidatePath("/dashboard/cargos")
  return { ok: true as const }
}

const toggleMemberSchema = z.object({
  memberId: z.string().min(1),
  groupId: z.string().min(1),
  enabled: z.boolean(),
})

export async function toggleMemberGroup(raw: z.infer<typeof toggleMemberSchema>) {
  const ctx = await getRbacContext()
  if ("error" in ctx) return { error: ctx.error }
  const parsed = toggleMemberSchema.safeParse(raw)
  if (!parsed.success) return { error: "Dados inválidos." }

  const member = await prisma.organizationMember.findFirst({
    where: { id: parsed.data.memberId, organizationId: ctx.organizationId },
    select: { id: true },
  })
  if (!member) return { error: "Membro não encontrado." }

  const group = await prisma.accountGroup.findFirst({
    where: { id: parsed.data.groupId, organizationId: ctx.organizationId },
    select: { id: true },
  })
  if (!group) return { error: "Cargo não encontrado." }

  if (parsed.data.enabled) {
    await prisma.organizationMemberGroup.upsert({
      where: {
        organizationMemberId_accountGroupId: {
          organizationMemberId: member.id,
          accountGroupId: group.id,
        },
      },
      update: {},
      create: {
        organizationId: ctx.organizationId,
        organizationMemberId: member.id,
        accountGroupId: group.id,
      },
    })
  } else {
    await prisma.organizationMemberGroup.deleteMany({
      where: {
        organizationMemberId: member.id,
        accountGroupId: group.id,
      },
    })
  }

  revalidatePath("/dashboard/cargos")
  return { ok: true as const }
}

export async function bootstrapRbacDefaults() {
  const ctx = await getRbacContext()
  if ("error" in ctx) return { error: ctx.error }
  await ensureRbacDefaults(ctx.organizationId, ctx.session.user.id)
  revalidatePath("/dashboard/cargos")
  return { ok: true as const }
}

