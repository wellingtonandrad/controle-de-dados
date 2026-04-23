export function ProfessionalsSkeleton() {
  return (
    <section
      id="profissionais"
      className="scroll-mt-24 bg-gray-50 py-16"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center">
          <div className="mx-auto h-9 w-72 animate-pulse rounded-lg bg-zinc-200" />
          <div className="mx-auto h-4 w-full max-w-lg animate-pulse rounded bg-zinc-200" />
        </div>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="h-10 w-full max-w-md animate-pulse rounded-md bg-zinc-200" />
          <div className="h-10 w-44 animate-pulse rounded-md bg-zinc-200 sm:ml-auto" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-sm"
            >
              <div className="h-48 animate-pulse bg-zinc-100" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-2/3 animate-pulse rounded bg-zinc-100" />
                <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
                <div className="h-10 w-full animate-pulse rounded-md bg-zinc-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
