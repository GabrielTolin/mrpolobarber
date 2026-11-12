// Telemóveis no formato E.164 (+351912345678), Arquitetura 3.4 / Requisitos 1.7.

const E164 = /^\+[1-9][0-9]{6,14}$/

// Aceita "912 345 678", "+351 912345678", "00351912345678", "+44 7700 900123".
// Números portugueses sem indicativo (9 dígitos a começar por 2 ou 9) ganham +351.
// Devolve null se não for um número válido.
export function normalizarTelefone(texto) {
  let t = String(texto ?? '').replace(/[\s().-]/g, '')
  if (t === '') return null
  if (t.startsWith('00')) t = `+${t.slice(2)}`
  if (/^[29]\d{8}$/.test(t)) t = `+351${t}`
  return E164.test(t) ? t : null
}

// +351912345678 → "+351 912 345 678" (só para mostrar).
export function formatarTelefone(e164) {
  if (!e164) return ''
  const m = e164.match(/^\+351(\d{3})(\d{3})(\d{3})$/)
  return m ? `+351 ${m[1]} ${m[2]} ${m[3]}` : e164
}

// Link de WhatsApp com mensagem pré-escrita.
export function linkWhatsapp(e164, mensagem = '') {
  const base = `https://wa.me/${String(e164).replace('+', '')}`
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base
}
