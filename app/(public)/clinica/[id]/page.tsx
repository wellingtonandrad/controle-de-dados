import { redirect } from "next/navigation"

/** Rota legada: redireciona para o agendamento público da empresa. */
export default async function LegacyClinicaRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/empresa/${encodeURIComponent(id)}`)
}
