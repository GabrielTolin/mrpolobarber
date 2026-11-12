// Dinheiro guardado em cêntimos (Arquitetura 3.4); mostrado em euros, pt-PT.

const formatador = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

// 2000 → "20 €" · 1750 → "17,50 €"
export function formatarEuros(centimos) {
  if (centimos == null) return '—'
  const valor = centimos / 100
  // Com cêntimos mostra sempre as duas casas ("17,50 €", não "17,5 €").
  return Number.isInteger(valor)
    ? formatador.format(valor)
    : new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valor)
}

// Texto escrito pelo utilizador → cêntimos. Aceita "17", "17,5", "17.50", "17,50 €".
// Devolve null se não for um valor válido (≥ 0, no máximo 2 casas decimais).
export function lerEuros(texto) {
  const limpo = String(texto ?? '').replace(/[€\s]/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null
  return Math.round(Number(limpo) * 100)
}

// Cêntimos → texto para um campo de formulário ("17,50"; "20").
export function eurosParaCampo(centimos) {
  if (centimos == null) return ''
  const valor = centimos / 100
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(2).replace('.', ',')
}
