// "Adicionar ao calendário" (2.10 / 3.9): ficheiro .ics gerado no próprio
// telemóvel, sem servidor. Abre no Calendário do iPhone, Google Calendar, Outlook…

const QUEBRA = '\r\n'

const paraIcs = (instante) => new Date(instante).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

// Texto seguro dentro do .ics (RFC 5545: escapar \ ; , e quebras de linha).
const escapar = (texto = '') => String(texto).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// Linhas com mais de 75 bytes são "dobradas" (RFC 5545 §3.1): quebra + espaço.
function dobrar(linha) {
  const enc = new TextEncoder()
  const partes = []
  let atual = ''
  for (const c of linha) {
    const limite = partes.length ? 74 : 75 // as continuações começam com um espaço
    if (enc.encode(atual + c).length > limite) {
      partes.push(atual)
      atual = c
    } else {
      atual += c
    }
  }
  partes.push(atual)
  return partes.join(`${QUEBRA} `)
}

export function criarIcs({ inicio, fim, titulo, local, descricao, uid }) {
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MR Polo Barber//Marcacoes//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${paraIcs(new Date())}`,
    `DTSTART:${paraIcs(inicio)}`,
    `DTEND:${paraIcs(fim)}`,
    `SUMMARY:${escapar(titulo)}`,
    local ? `LOCATION:${escapar(local)}` : null,
    descricao ? `DESCRIPTION:${escapar(descricao)}` : null,
    // Lembrete 1 hora antes (o calendário do cliente é que avisa; sem SMS nem email).
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapar(titulo)}`,
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  return linhas.map(dobrar).join(QUEBRA) + QUEBRA
}

export function descarregarIcs(conteudo, nomeFicheiro = 'marcacao.ics') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nomeFicheiro
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
