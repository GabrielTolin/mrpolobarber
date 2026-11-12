// Datas e horas sempre na hora de Portugal (Arquitetura 3.1, decisão 7).
export const FUSO = 'Europe/Lisbon'

// "Quinta-feira, 12 de novembro"
export function dataPorExtenso(data = new Date()) {
  const texto = new Intl.DateTimeFormat('pt-PT', {
    timeZone: FUSO,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(data)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// "Bom dia" até às 12h, "Boa tarde" até às 20h, depois "Boa noite".
export function saudacao(data = new Date()) {
  const hora = Number(
    new Intl.DateTimeFormat('pt-PT', { timeZone: FUSO, hour: 'numeric', hourCycle: 'h23' }).format(data)
  )
  if (hora < 12) return 'Bom dia'
  if (hora < 20) return 'Boa tarde'
  return 'Boa noite'
}
