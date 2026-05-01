import { getTimesClinic} from "../../_components/_data-access/get-times-clinic"
import { AppointmentsList } from "./appointments-list"

export async function Appointments({
  organizationId,
}: {
  organizationId: string
}) {

const { times } = await getTimesClinic({ organizationId })



    return(
        <AppointmentsList times={times}/>
    )
}