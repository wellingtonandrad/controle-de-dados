import { getOrganizationScheduleTimes } from "../../_components/_data-access/get-organization-schedule-times"
import { AppointmentsList } from "./appointments-list"

export async function Appointments({
  organizationId,
}: {
  organizationId: string
}) {

const { times } = await getOrganizationScheduleTimes({ organizationId })



    return(
        <AppointmentsList times={times}/>
    )
}