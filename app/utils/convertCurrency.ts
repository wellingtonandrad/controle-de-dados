// - Valor em centavos = Valor em reais *100
// - Valor em centavos = Valor em centavos / 100
// "100,00" > int (centavos)


/**
 * Converte um valor monetário em reais para centavos.
 * @param {string} amount - o valor monetário em reais (BRL) a ser convertido
 * @returns {number} O valor convertido em centavos. 
 * 
 * @example
 * convertRealToCents("1.300,50"): // Retorna 123456 cents
 */

export function convertRealToCents(amount: string){
    const numericPrice = parseFloat(amount.replace(/\./g, "").replace(",", "."))
    const priceInCents = Math.round(numericPrice * 100) 

    return priceInCents;
}

export function formatCentsToBrl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100)
}

/** Aceita "10,50" / "1.234,56" (pt-BR) ou "10.5" (decimal com ponto). */
export function parseMoneyToCents(raw: string): number {
  const s = raw.trim()
  if (!s) {
    throw new Error("Valor vazio")
  }
  if (s.includes(",")) {
    return convertRealToCents(s)
  }
  const n = Number.parseFloat(s)
  if (Number.isNaN(n)) {
    throw new Error("Valor inválido")
  }
  return Math.round(n * 100)
}