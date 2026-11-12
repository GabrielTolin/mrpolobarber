import { supabase } from '../../../lib/supabase'
import { partesLisboa } from '../../../lib/datas'

// Marcações futuras ativas (para os avisos de "marcações afetadas", 2.12 regra 4).
export async function marcacoesFuturas() {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, start_at, end_at, client_name, clients(phone_e164), appointment_services(service_name)')
    .in('status', ['confirmed', 'in_progress'])
    .gte('end_at', new Date().toISOString())
    .order('start_at')
  if (error) throw error
  return data.map((a) => ({
    ...a,
    client_phone: a.clients?.phone_e164 ?? null,
    services: a.appointment_services.map((s) => s.service_name).join(' + '),
  }))
}

// Uma marcação fica fora de um horário {aberto, abertura, fecho, pausas[]}?
export function foraDoHorario(marcacao, horario) {
  if (!horario.aberto) return true
  const inicio = partesLisboa(marcacao.start_at).hora
  const fim = partesLisboa(marcacao.end_at).hora
  if (inicio < horario.abertura || fim > horario.fecho) return true
  return horario.pausas.some((p) => inicio < p.fim && fim > p.inicio)
}
