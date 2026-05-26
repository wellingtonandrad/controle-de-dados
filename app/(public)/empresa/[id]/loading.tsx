export default function ClinicScheduleLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-40 w-full bg-emerald-200/80" />
      <div className="container mx-auto flex flex-col items-center px-4" style={{ marginTop: -64 }}>
        <div className="mb-8 h-48 w-48 shrink-0 animate-pulse rounded-full border-4 border-white bg-zinc-200" />
        <div className="mb-2 h-8 w-56 animate-pulse rounded-md bg-zinc-200" />
        <div className="h-5 w-72 max-w-full animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="mx-auto mt-8 max-w-2xl space-y-4 px-6">
        <div className="h-64 animate-pulse rounded-lg border bg-zinc-50" />
      </div>
    </div>
  )
}
