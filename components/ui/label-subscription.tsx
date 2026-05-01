export function LabelSubscription({ expired }: { expired: boolean }) {
  return (
    <div className="my-4 flex flex-col gap-3 rounded-md bg-red-400 px-3 py-2 text-sm text-white md:flex-row md:items-center md:text-base">
      <div>
        {expired ? (
          <h3 className="font-semibold">
            Assinatura inativa ou período encerrado
          </h3>
        ) : (
          <h3 className="font-semibold">Limite do plano atingido</h3>
        )}
        <p className="text-sm text-gray-50">
          Entre em contato com o administrador do sistema se precisar de
          acesso ampliado.
        </p>
      </div>
    </div>
  )
}
