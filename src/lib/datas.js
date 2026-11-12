// Datas e horas sempre na hora de Portugal (Arquitetura 3.1, decisão 7).
export const FUSO = 'Europe/Lisbon'

export const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] // ISO 1–7

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

// Partes de um instante em hora de Lisboa: { data: 'AAAA-MM-DD', hora: 'HH:MM', diaSemana: 1–7 }
export function partesLisboa(instante) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: FUSO,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(instante))
      .map(({ type, value }) => [type, value])
  )
  const dias = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}`, diaSemana: dias[p.weekday] }
}

// Hoje em Lisboa, 'AAAA-MM-DD'.
export function hojeLisboa() {
  return partesLisboa(new Date()).data
}

// 'AAAA-MM-DD' (+ n dias) — aritmética de calendário, sem fusos.
export function somarDias(dataISO, n) {
  const d = new Date(`${dataISO}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Dia da semana ISO (1–7) de uma data 'AAAA-MM-DD'.
export function diaSemanaDe(dataISO) {
  const d = new Date(`${dataISO}T12:00:00Z`).getUTCDay()
  return d === 0 ? 7 : d
}

// 'AAAA-MM-DD' → "qui, 13 nov 2026"
export function formatarData(dataISO, { ano = true } = {}) {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(ano ? { year: 'numeric' } : {}),
  }).format(new Date(`${dataISO}T12:00:00Z`))
}

// Instante → "qui, 13 nov, 10:00" (hora de Lisboa)
export function formatarInstante(instante) {
  const { data, hora } = partesLisboa(instante)
  return `${formatarData(data, { ano: false })}, ${hora}`
}

// "HH:MM:SS" ou "HH:MM" → "HH:MM"
export function horaCurta(hora) {
  return hora ? hora.slice(0, 5) : ''
}
