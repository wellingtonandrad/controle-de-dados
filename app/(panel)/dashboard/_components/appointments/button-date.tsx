"use client"

import { useState } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

export function ButtonPickerAppointment(){
    const router = useRouter();


    const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"))

    function handleChangeDate(event: React.ChangeEvent<HTMLInputElement>){

        const url = new URL(window.location.href)

        url.searchParams.set("date", event.target.value)
        router.push(url.toString())

setSelectedDate(event.target.value)

    }
    
    return(
       <div>
        <input
           type="date"
           id="start"
           className="border-2 px-2 py-1 rounded-md text-sm md:text-base"
           value={selectedDate}
           onChange={handleChangeDate}
        />      
         </div>
    )
}