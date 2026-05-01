import { getReminders } from "../_data-access/get-reminders"
import { ReminderList } from "./reminder-list"

export async function Reminders({ organizationId }: { organizationId: string }) {
const reminders = await getReminders({ organizationId })



    return(
     <ReminderList reminder={reminders} />  
    )
}