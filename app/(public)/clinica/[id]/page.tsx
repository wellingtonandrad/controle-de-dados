import { getInfoSchedule } from "./_date-acess/get-info-schedule"
import { ScheduleContent } from "./_components/schedule-content"

export default async function SchedulePage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getInfoSchedule({ userId: params.id })

  console.log("Dados do usuário para agendamento:", user)

  return <ScheduleContent />
}