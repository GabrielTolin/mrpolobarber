import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Pencil, UserRound } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { formatarEuros } from '../../../lib/dinheiro'
import { formatarInstante, partesLisboa } from '../../../lib/datas'
import { descreverEstado, estadoEfetivo, ESTADOS, ORIGENS } from '../../../lib/estados'
import { formatarTelefone, linkWhatsapp } from '../../../lib/telefone'

const CAMPOS = {
  start_at: 'Hora',
  end_at: 'Fim',
  client_id: 'Cliente',
  client_name: 'Nome',
  total_price_cents: 'Preço',
  total_duration_minutes: 'Duração',
  client_notes: 'Observações',
  is_intentional_overlap: 'Sobreposição intencional',
  cancelled_late: 'Cancelamento tardio',
  service: 'Serviço',
  status: 'Estado',
}
const ATORES = { client: 'Cliente', barber: 'Barbeiro', system: 'Sistema' }

function valorLegivel(campo, v) {
  if (v == null) return '—'
  if (campo === 'start_at' || campo === 'end_at') return formatarInstante(v)
  if (campo === 'total_price_cents') return formatarEuros(Number(v))
  if (campo === 'total_duration_minutes') return `${v} min`
  if (campo === 'status') return ESTADOS[v]?.label ?? v
  if (v === 'true') return 'sim'
  if (v === 'false') return 'não'
  return v
}

// Detalhe de uma marcação com as ações permitidas pelo estado (2.3, 2.6).
export default function DetalheMarcacao({ marcacao: m, settings, agora, onEditar, onAtualizado }) {
  const [eventos, setEventos] = useState([])
  const [nota, setNota] = useState('')
  const [aCancelar, setACancelar] = useState(false)
  const [erro, setErro] = useState('')
  const [aGravar, setAGravar] = useState(false)

  const estado = estadoEfetivo(m, agora)
  const telefone = m.clients?.phone_e164
  const quando = formatarInstante(m.start_at)
  const servico = m.appointment_services.map((s) => s.service_name).join(' + ')
  const tolerancia = settings?.late_tolerance_minutes ?? 10
  const podeFalta =
    estado === 'in_progress' && agora.getTime() >= new Date(m.start_at).getTime() + tolerancia * 60000
  const futura = new Date(m.start_at) > agora

  const carregarEventos = useCallback(async () => {
    const { data } = await supabase
      .from('appointment_events')
      .select('*')
      .eq('appointment_id', m.id)
      .order('created_at', { ascending: false })
    setEventos(data ?? [])
  }, [m.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarEventos()
  }, [carregarEventos])

  async function chamar(funcao, args) {
    setErro('')
    setAGravar(true)
    const { error } = await supabase.rpc(funcao, args)
    setAGravar(false)
    if (error) {
      setErro(error.message || 'Não foi possível concluir a ação.')
      return false
    }
    onAtualizado()
    carregarEventos()
    return true
  }

  async function adicionarNota() {
    if (!nota.trim()) return
    if (await chamar('admin_add_note', { p_id: m.id, p_note: nota })) setNota('')
  }

  const msgLembrete = `Olá ${m.client_name}, lembrete da sua marcação no ${settings?.business_name ?? 'barbeiro'}: ${quando} — ${servico}.`
  const msgCancelada = `Olá ${m.client_name}, infelizmente tive de cancelar a sua marcação de ${quando}. Pode marcar novo horário em ${window.location.origin}`

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="font-serif text-[40px] leading-none font-semibold text-gold">{partesLisboa(m.start_at).hora}</p>
        <p className="text-sm text-muted">{quando} · até {partesLisboa(m.end_at).hora}</p>
        <p className={`mt-1 text-sm font-semibold ${ESTADOS[estado].cor}`}>
          {descreverEstado(m, agora)}
          {m.is_intentional_overlap && <span className="ml-2 font-normal text-warn">· sobreposição</span>}
        </p>
      </div>

      <div className="flex flex-col gap-1 rounded-lg border border-line-btn px-4 py-3 text-sm">
        <p className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold">{m.client_name}</span>
          <Link to={`/admin/clientes/${m.client_id}`} className="flex items-center gap-1 text-[13px] text-gold-2 hover:underline">
            <UserRound size={14} strokeWidth={1.8} aria-hidden /> Ver ficha
          </Link>
        </p>
        <p className="text-muted">
          {telefone ? formatarTelefone(telefone) : 'Sem telemóvel'} · {m.clients?.is_regular ? 'Habitual' : 'Visitante'}
        </p>
        <p>
          {servico} · {m.total_duration_minutes} min · <span className="text-price">{formatarEuros(m.total_price_cents)}</span>
        </p>
        <p className="text-muted">Origem: {ORIGENS[m.source]}</p>
        {m.client_notes && <p className="text-muted">“{m.client_notes}”</p>}
      </div>

      {/* Ações por estado (2.6 opção A) */}
      <div className="flex flex-wrap gap-2">
        {podeFalta && (
          <button type="button" disabled={aGravar} onClick={() => window.confirm('Registar falta? Fica no histórico do cliente.') && chamar('admin_mark_no_show', { p_id: m.id })} className="btn-gold px-4">
            Registar falta
          </button>
        )}
        {(estado === 'confirmed' || estado === 'in_progress') && (
          <button type="button" onClick={onEditar} className="btn-ghost flex items-center gap-2 px-4">
            <Pencil size={14} strokeWidth={1.8} aria-hidden /> Editar
          </button>
        )}
        {telefone && estado === 'confirmed' && futura && (
          <a href={linkWhatsapp(telefone, msgLembrete)} target="_blank" rel="noreferrer" className="btn-ghost flex items-center gap-2 px-4">
            <MessageCircle size={14} strokeWidth={1.8} aria-hidden /> Enviar lembrete
          </a>
        )}
        {(estado === 'confirmed' || estado === 'in_progress') && !aCancelar && (
          <button type="button" onClick={() => setACancelar(true)} className="btn-ghost px-4 text-warn">
            Cancelar
          </button>
        )}
        {m.status === 'cancelled' && (
          <button type="button" disabled={aGravar} onClick={() => chamar('admin_set_cancelled_late', { p_id: m.id, p_late: !m.cancelled_late })} className="btn-ghost px-4">
            {m.cancelled_late ? 'Não foi tardio' : 'Marcar como tardio'}
          </button>
        )}
      </div>

      {aCancelar && (
        <div className="flex flex-col gap-3 rounded-lg border border-warn/40 bg-warn/5 p-4">
          <p className="text-sm font-semibold">Cancelar esta marcação?</p>
          <p className="text-xs text-muted">
            “Tardio” é quando o cliente avisou depois do prazo: fica no histórico e não conta como falta.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={aGravar} onClick={async () => (await chamar('admin_cancel_booking', { p_id: m.id, p_late: false })) && setACancelar(false)} className="btn-gold px-4">
              Cancelar
            </button>
            <button type="button" disabled={aGravar} onClick={async () => (await chamar('admin_cancel_booking', { p_id: m.id, p_late: true })) && setACancelar(false)} className="btn-ghost px-4">
              Cancelar como tardio
            </button>
            <button type="button" onClick={() => setACancelar(false)} className="btn-ghost px-4">Voltar</button>
          </div>
        </div>
      )}

      {m.status === 'cancelled' && m.cancelled_by === 'barber' && telefone && (
        <a href={linkWhatsapp(telefone, msgCancelada)} target="_blank" rel="noreferrer" className="flex w-fit items-center gap-2 text-[13px] text-gold-2 hover:underline">
          <MessageCircle size={14} strokeWidth={1.8} aria-hidden /> Avisar o cliente por WhatsApp
        </a>
      )}

      {erro && <p className="text-sm text-warn" role="alert">{erro}</p>}

      <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
        <p className="text-sm font-semibold">Nota interna</p>
        <div className="flex gap-2">
          <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Só o barbeiro vê" className="field" />
          <button type="button" onClick={adicionarNota} disabled={aGravar || !nota.trim()} className="btn-ghost px-4">Juntar</button>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
        <p className="text-sm font-semibold">Histórico</p>
        <ul className="flex flex-col gap-1.5 text-xs text-muted">
          {eventos.map((e) => (
            <li key={e.id}>
              <span className="text-muted-2">{formatarInstante(e.created_at)} · {ATORES[e.actor]}:</span>{' '}
              {e.type === 'created' && 'marcação criada'}
              {e.type === 'note' && <span className="text-fg">“{e.note}”</span>}
              {(e.type === 'updated' || e.type === 'status_changed') &&
                `${CAMPOS[e.field] ?? e.field}: ${valorLegivel(e.field, e.old_value)} → ${valorLegivel(e.field, e.new_value)}`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
