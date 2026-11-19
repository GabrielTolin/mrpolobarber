import { supabase } from '../../lib/supabase'

// Marcação semanal no painel (S.3, docs/SEMANAL.md). As escritas passam pelas
// funções do servidor (admin_weekly_*); a tabela só é lida.

export const SELECT_SERIE =
  'id, client_id, service_id, weekday, time_local, status, requested_by, origin_appointment_id, stop_reason, created_at, decided_at, stopped_at, clients(name, phone_e164), services(name)'

const DIAS = ['segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados', 'domingos']
const DIAS_CURTOS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']

// "terças às 10:00"
export const textoSerie = (s) => `${DIAS[s.weekday - 1]} às ${String(s.time_local).slice(0, 5)}`

// "AAAA-MM-DD" → "ter 01/12"
export function dataCurta(data) {
  const d = new Date(`${data}T12:00:00Z`)
  return `${DIAS_CURTOS[(d.getUTCDay() + 6) % 7].slice(0, 3)} ${data.slice(8, 10)}/${data.slice(5, 7)}`
}

export const ESTADOS_SERIE = {
  pending: { label: 'À espera de aprovação', cor: 'text-gold' },
  active: { label: 'Ativa', cor: 'text-ok' },
  rejected: { label: 'Recusada', cor: 'text-muted-2' },
  stopped: { label: 'Parada', cor: 'text-muted-2' },
}

async function chamar(funcao, args) {
  const { data, error } = await supabase.rpc(funcao, args)
  if (error) throw new Error(error.message)
  return data
}

export const decidirSerie = (id, aprovar) => chamar('admin_weekly_decide', { p_id: id, p_approve: aprovar })
export const pararSerie = (id) => chamar('admin_weekly_stop', { p_id: id })
export const criarSerie = (clienteId, servicoId, inicioLocal) =>
  chamar('admin_weekly_create', { p_client_id: clienteId, p_service_id: servicoId, p_first_start_local: inicioLocal })

export async function listarPendentes() {
  const { data, error } = await supabase.from('weekly_series').select(SELECT_SERIE).eq('status', 'pending').order('created_at')
  if (error) throw new Error(error.message)
  return data
}

export async function seriesDoCliente(clienteId) {
  const { data, error } = await supabase
    .from('weekly_series')
    .select(SELECT_SERIE)
    .eq('client_id', clienteId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

// Resumo do que o servidor fez ao aprovar/criar: "Marcadas: ter 01/12, ter 08/12 · Saltou: ter 15/12 (feriado)"
export function resumoGeracao(r) {
  const criadas = (r?.created ?? []).map((c) => dataCurta(c.date))
  const saltadas = (r?.skipped ?? []).map((s) => `${dataCurta(s.date)} (${s.reason})`)
  const partes = []
  partes.push(criadas.length ? `Marcadas: ${criadas.join(', ')}` : 'Nenhuma semana marcada ainda')
  if (saltadas.length) partes.push(`Não marcadas: ${saltadas.join(', ')}`)
  return partes.join(' · ')
}
