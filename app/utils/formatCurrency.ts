import { number } from "zod"

const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
     currency: "BRL",
     style: "currency",
     minimumFractionDigits: 0
})

export function formatCurrency(number: number) {
    return CURRENCY_FORMATTER.format(number) //Serve para formatar o valor para: R$ 100,00 em diante
}