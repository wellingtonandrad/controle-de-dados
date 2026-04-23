import { getInfoSchedule } from "./_date-acess/get-info-schedule"
import { ScheduleContent } from "./_components/schedule-content"
import { redirect } from "next/navigation"

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {

  const userId = (await params).id
  const user = await getInfoSchedule({ userId: userId })

  if(!user){
    redirect("/")
  }

  return <ScheduleContent clinic={user} />
}