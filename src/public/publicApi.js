import { supabase } from '../lib/supabase'
import { DIAS_SEMANA } from '../lib/datas'

// Acesso da área pública ao backend: SÓ funções públicas (6.1, Arquitetura 3.7 §3).
// As leituras lançam um Error com `codigo`; as escritas devolvem { ok, error, … }.

class ErroPublico extends Error {
  constructor(codigo, mensagem) {
    super(mensagem ?? codigo)
    this.codigo = codigo
  }
}

async function chamar(funcao, args) {
  const { data, error } = await supabase.rpc(funcao, args)
  if (error) {
    const codigo = error.message?.includes('RATE_LIMITED') ? 'RATE_LIMITED' : 'NETWORK'
    throw new ErroPublico(codigo, error.message)
  }
  return data
}

// Escritas: erros de negócio vêm na resposta; falhas de rede viram { ok: false, error: 'NETWORK' }.
async function chamarAcao(funcao, args) {
  try {
    return await chamar(funcao, args)
  } catch (e) {
    return { ok: false, error: e.codigo ?? 'NETWORK' }
  }
}

export const obterInfo = () => chamar('public_info')
export const obterServicos = () => chamar('public_services')

export async function diasDisponiveis(serviceId, de, ate) {
  const dias = await chamar('available_days', { p_service_id: serviceId, p_from: de, p_to: ate })
  return new Set(dias ?? [])
}

export async function horasDisponiveis(serviceId, dia) {
  return (await chamar('available_times', { p_service_id: serviceId, p_date: dia })) ?? []
}

export const cotarPreco = (serviceId, telefone) =>
  chamarAcao('quote_price', { p_service_id: serviceId, p_phone: telefone })

export const criarMarcacao = ({ serviceId, inicio, nome, telefone, observacoes, chave, armadilha }) =>
  chamarAcao('create_booking', {
    p_service_id: serviceId,
    p_start_at: inicio,
    p_name: nome,
    p_phone: telefone,
    p_notes: observacoes || null,
    p_idempotency_key: chave,
    p_website: armadilha || null,
  })

// Mensagens ao cliente para cada código de erro (Arquitetura 3.6 §4, 3.7 §4).
export const MENSAGENS = {
  SLOT_TAKEN: 'Esse horário acabou de ser ocupado. Escolha outro.',
  TOO_LATE: 'Esse horário já não está disponível. Escolha outro.',
  PHONE_BLOCKED: 'Não é possível marcar online com este número. Contacte o barbeiro.',
  LIMIT_REACHED: 'Já tem marcações agendadas no limite permitido. Para marcar outra, contacte o barbeiro.',
  INVALID_PHONE: 'Confirme o número de telemóvel.',
  INVALID_NAME: 'Escreva o seu nome.',
  INVALID_NOTES: 'As observações podem ter no máximo 200 caracteres.',
  SERVICE_UNAVAILABLE: 'Este serviço deixou de estar disponível. Escolha outro.',
  RATE_LIMITED: 'Demasiadas tentativas. Tente mais tarde ou contacte o barbeiro.',
  REJECTED: 'Não foi possível concluir a marcação. Contacte o barbeiro.',
  INVALID_REQUEST: 'Não foi possível concluir a marcação. Tente de novo.',
  NETWORK: 'Sem ligação. Verifique a internet e tente de novo.',
}

// ── Horário semanal (public_info.weekly_hours) em texto ──────────────────────

function textoDoDia(d) {
  if (!d.is_open) return 'Fechado'
  // Janelas = abertura → pausas → fecho
  const partes = []
  let inicio = d.open_time
  for (const p of d.breaks ?? []) {
    partes.push(`${inicio}–${p.start}`)
    inicio = p.end
  }
  partes.push(`${inicio}–${d.close_time}`)
  return partes.join(' · ')
}

const NOMES_CURTOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

// Agrupa dias seguidos com o mesmo horário: [['Segunda a sexta', '09:00–13:00 · 14:00–19:00'], …]
export function horarioEmLinhas(weeklyHours = []) {
  const dias = [...weeklyHours].sort((a, b) => a.weekday - b.weekday)
  const linhas = []
  for (const d of dias) {
    const texto = textoDoDia(d)
    const ultima = linhas.at(-1)
    if (ultima && ultima.texto === texto && ultima.ate === d.weekday - 1) {
      ultima.ate = d.weekday
    } else {
      linhas.push({ de: d.weekday, ate: d.weekday, texto })
    }
  }
  return linhas.map(({ de, ate, texto }) => {
    const nome = (w) => DIAS_SEMANA[w - 1]
    const dias = de === ate ? nome(de) : `${nome(de)} a ${nome(ate).toLowerCase()}`
    return [dias, texto]
  })
}

// Resumo curto para os destaques da página de entrada: ['Seg a Sáb', '09:00–19:00'].
export function horarioResumo(weeklyHours = []) {
  const abertos = weeklyHours.filter((d) => d.is_open).sort((a, b) => a.weekday - b.weekday)
  if (!abertos.length) return ['Horário', 'por confirmar']
  const primeiro = abertos[0]
  const ultimo = abertos.at(-1)
  const dias = primeiro === ultimo ? NOMES_CURTOS[primeiro.weekday - 1] : `${NOMES_CURTOS[primeiro.weekday - 1]} a ${NOMES_CURTOS[ultimo.weekday - 1]}`
  const abre = abertos.map((d) => d.open_time).sort()[0]
  const fecha = abertos.map((d) => d.close_time).sort().at(-1)
  return [dias, `${abre}–${fecha}`]
}
