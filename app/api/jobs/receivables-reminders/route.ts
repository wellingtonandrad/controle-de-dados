import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { sendReceivablesRemindersForOrganization } from "@/lib/notifications/receivables-reminder"

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret")
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgs = await prisma.organization.findMany({ select: { id: true } })
  let sent = 0
  let failed = 0

  for (const org of orgs) {
    const result = await sendReceivablesRemindersForOrganization(org.id)
    if ("error" in result) {
      failed += 1
      continue
    }
    sent += result.sent
  }

  return NextResponse.json({ ok: true, organizations: orgs.length, sent, failed })
}

