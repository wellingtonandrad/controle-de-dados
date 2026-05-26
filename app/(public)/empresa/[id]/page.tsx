import { getInfoSchedule } from "./_date-acess/get-info-schedule"
import { ScheduleContent } from "./_components/schedule-content"
import { redirect } from "next/navigation"

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {

  const organizationId = (await params).id
  const organization = await getInfoSchedule({ organizationId })

  if (!organization) {
    redirect("/")
  }

  return <ScheduleContent organization={organization} />
}