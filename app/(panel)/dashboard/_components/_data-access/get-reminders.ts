"use server"

import prisma from "@/lib/prisma"
import type { Reminder } from "@/lib/generated/prisma"

export async function getReminders({
  userId,
}: {
  userId: string
}): Promise<Reminder[]> {
  if (!userId) {
    return []
  }

  try {
    const reminders = await prisma.reminder.findMany({
      where: {
        userId,
      },
    })
    return reminders
  } catch (err) {
    console.error(err)
    return []
  }
}
