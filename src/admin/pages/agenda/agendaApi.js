import { supabase } from '../../../lib/supabase'
import { diaSemanaDe, horaCurta, instanteLisboa, paraMinutos, partesLisboa, somarDias } from '../../../lib/datas'

// Segunda-feira da semana de uma data.
export function inicioSemana(dataISO) {
  return somarDias(dataISO, 1 - diaSemanaDe(dataISO))
}

const CAMPOS_MARCACAO =
  'id, client_id, client_name, start_at, end_at, status, source, total_price_cents, total_duration_minutes, client_notes, is_intentional_overlap, cancelled_by, cancelled_late, cancelled_at, clients(name, phone_e164, is_regular, is_blocked), appointment_services(service_id, service_name, price_cents, duration_minutes)'

// Marcações, bloqueios e configuração de horários de [de, até[ (datas de Lisboa).
export async function carregarPeriodo(de, ate) {
  const ini = instanteLisboa(de).toISOString()
  const fim = instanteLisboa(ate).toISOString()
  const [ap, bl, wh, br, ov, ho, st] = await Promise.all([
    supabase.from('appointments').select(CAMPOS_MARCACAO).gte('start_at', ini).lt('start_at', fim).order('start_at'),
    supabase.from('blocks').select('*').lt('start_at', fim).gt('end_at', ini).order('start_at'),
    supabase.from('weekly_hours').select('*'),
    supabase.from('weekly_breaks').select('*'),
    supabase.from('day_overrides').select('*').gte('date', de).lt('date', ate),
    supabase.from('holidays').select('*').gte('date', de).lt('date', ate).eq('is_active', true),
    supabase.from('settings').select('late_tolerance_minutes, business_name, whatsapp_phone, address').eq('id', 1).single(),
  ])
  const erro = [ap, bl, wh, br, ov, ho, st].find((r) => r.error)
  if (erro) throw erro.error
  return {
    marcacoes: ap.data,
    bloqueios: bl.data,
    config: { semana: wh.data, pausas: br.data, especiais: ov.data, feriados: ho.data },
    settings: st.data,
  }
}

// Janelas de trabalho de um dia (espelha day_windows da 5.7), em minutos de Lisboa.
// Devolve { janelas: [{inicio, fim}], nota } — nota explica dias fechados/especiais.
export function janelasDoDia(dataISO, config) {
  const feriado = config.feriados.find((f) => f.date === dataISO)
  if (feriado) return { janelas: [], nota: `Feriado · ${feriado.name}` }

  const especial = config.especiais.find((e) => e.date === dataISO)
  if (especial) {
    if (especial.is_closed) return { janelas: [], nota: `Fechado${especial.note ? ` · ${especial.note}` : ''}` }
    return {
      janelas: [{ inicio: paraMinutos(horaCurta(especial.open_time)), fim: paraMinutos(horaCurta(especial.close_time)) }],
      nota: `Horário especial${especial.note ? ` · ${especial.note}` : ''}`,
    }
  }

  const dia = config.semana.find((w) => w.weekday === diaSemanaDe(dataISO))
  if (!dia?.is_open) return { janelas: [], nota: 'Fechado' }

  let janelas = [{ inicio: paraMinutos(horaCurta(dia.open_time)), fim: paraMinutos(horaCurta(dia.close_time)) }]
  for (const p of config.pausas.filter((b) => b.weekday === dia.weekday)) {
    janelas = subtrair(janelas, paraMinutos(horaCurta(p.start_time)), paraMinutos(horaCurta(p.end_time)))
  }
  return { janelas, nota: null }
}

function subtrair(janelas, ini, fim) {
  return janelas.flatMap((j) => {
    if (fim <= j.inicio || ini >= j.fim) return [j]
    const partes = []
    if (ini > j.inicio) partes.push({ inicio: j.inicio, fim: ini })
    if (fim < j.fim) partes.push({ inicio: fim, fim: j.fim })
    return partes
  })
}

// Minutos de Lisboa [início, fim[ de um intervalo, limitados ao dia indicado.
export function minutosNoDia(inicioISO, fimISO, dataISO) {
  const a = partesLisboa(inicioISO)
  const b = partesLisboa(fimISO)
  const inicio = a.data < dataISO ? 0 : paraMinutos(a.hora)
  const fim = b.data > dataISO ? 24 * 60 : paraMinutos(b.hora)
  return { inicio, fim }
}

// Espaços livres do dia: janelas de trabalho − marcações ativas − bloqueios.
export function livresDoDia(dataISO, config, marcacoes, bloqueios) {
  let livres = janelasDoDia(dataISO, config).janelas
  const ocupados = [
    ...marcacoes.filter((m) => m.status === 'confirmed' || m.status === 'in_progress'),
    ...bloqueios,
  ]
  for (const o of ocupados) {
    const { inicio, fim } = minutosNoDia(o.start_at, o.end_at, dataISO)
    livres = subtrair(livres, inicio, fim)
  }
  return livres.filter((l) => l.fim - l.inicio >= 5)
}

// Marcações e bloqueios que tocam um dia (sobreposição com [00:00, 00:00 do dia seguinte[).
export function doDia(lista, dataISO) {
  const ini = instanteLisboa(dataISO).getTime()
  const fim = instanteLisboa(somarDias(dataISO, 1)).getTime()
  return lista.filter((x) => new Date(x.start_at).getTime() < fim && new Date(x.end_at).getTime() > ini)
}
