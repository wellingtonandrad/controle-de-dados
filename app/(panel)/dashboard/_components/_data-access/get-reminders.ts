"use server"

import prisma from "@/lib/prisma"
import type { Reminder } from "@/lib/generated/prisma"

export async function getReminders({
  organizationId,
}: {
  organizationId: string
}): Promise<Reminder[]> {
  if (!organizationId) {
    return []
  }

  try {
    const reminders = await prisma.reminder.findMany({
      where: {
        organizationId,
      },
    })
    return reminders
  } catch (err) {
    console.error(err)
    return []
  }
}
