"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { useRouter, useSearchParams } from "next/navigation"

function parseDateParam(value: string | null): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  return format(new Date(), "yyyy-MM-dd")
}

export function ButtonPickerAppointment() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const effectiveDate = parseDateParam(searchParams.get("date"))

  const [selectedDate, setSelectedDate] = useState(effectiveDate)

  useEffect(() => {
    setSelectedDate(effectiveDate)
  }, [effectiveDate])

  function handleChangeDate(event: React.ChangeEvent<HTMLInputElement>) {
    const url = new URL(window.location.href)
    url.searchParams.set("date", event.target.value)
    router.push(url.toString())
    setSelectedDate(event.target.value)
  }

  return (
    <div>
      <input
        type="date"
        id="start"
        className="rounded-md border-2 px-2 py-1 text-sm md:text-base"
        value={selectedDate}
        onChange={handleChangeDate}
      />
    </div>
  )
}