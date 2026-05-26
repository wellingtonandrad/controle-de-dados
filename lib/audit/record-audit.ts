import type { AuditLogCategory, Prisma } from "@/lib/generated/prisma"
import prisma from "@/lib/prisma"

export type RecordAuditInput = {
  organizationId: string
  userId?: string | null
  category: AuditLogCategory
  action: string
  summary: string
  entityType?: string
  entityId?: string
  metadata?: Prisma.InputJsonValue
}

/** Registra auditoria sem interromper a operação principal se falhar. */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        category: input.category,
        action: input.action,
        summary: input.summary.slice(0, 500),
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? undefined,
      },
    })
  } catch (err) {
    console.error("[audit]", err)
  }
}
