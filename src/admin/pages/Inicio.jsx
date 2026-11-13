import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatarEuros } from '../../lib/dinheiro'
import { dataPorExtenso, formatarInstante, partesLisboa, saudacao } from '../../lib/datas'
import { descreverEstado, estadoEfetivo, ESTADOS } from '../../lib/estados'
import { linkWhatsapp } from '../../lib/telefone'
import { useAgora } from '../../hooks/useAgora'
import Carregando from '../../components/Carregando'
import CabecalhoPagina from '../CabecalhoPagina'
import { resumoDoCliente, useDashboard } from './inicio/useDashboard'

const COR_PONTO = { confirmed: 'bg-ok', in_progress: 'bg-gold', completed: 'bg-muted-2', cancelled: 'bg-muted-2', no_show: 'bg-warn' }

// "em 2h 15min" / "em 25min" / "agora"
function falta(ms) {
  const min = Math.max(0, Math.round(ms / 60000))
  if (min < 1) return 'agora'
  const h = Math.floor(min / 60)
  return h ? `em ${h}h ${min % 60}min` : `em ${min}min`
}

// "12.ª visita · último corte há 3 semanas" (handoff do design)
function metaCliente({ visitas, ultima }, agora) {
  if (!visitas) return 'Primeira visita'
  const dias = ultima ? Math.floor((agora - new Date(ultima)) / 86400000) : null
  const ha =
    dias == null ? '' : dias < 1 ? ' · último corte hoje' : dias < 14 ? ` · último corte há ${dias} dias` : dias < 60 ? ` · último corte há ${Math.round(dias / 7)} semanas` : ` · último corte há ${Math.round(dias / 30)} meses`
  return `${visitas + 1}.ª visita${ha}`
}

// Início / Dashboard (Especificação 2.8; visual do handoff do design).
export default function Inicio() {
  const navigate = useNavigate()
  const agora = useAgora()
  const { dados, erro, recarregar } = useDashboard()
  const [erroAcao, setErroAcao] = useState('')
  const nome = dados?.settings?.owner_name

  const marcacoes = dados?.marcacoes ?? []
  const comEstado = marcacoes.map((m) => ({ ...m, estado: estadoEfetivo(m, agora) }))
  const validas = comEstado.filter((m) => m.estado !== 'cancelled')
  const concluidas = validas.filter((m) => m.estado === 'completed').length
  const porAtender = validas.filter((m) => m.estado === 'confirmed' || m.estado === 'in_progress').length
  const emCurso = comEstado.find((m) => m.estado === 'in_progress')
  const proxima = comEstado.find((m) => m.estado === 'confirmed' && new Date(m.start_at) > agora)
  const limiteFaltas = dados?.settings?.no_show_flag_threshold ?? 2
  const tolerancia = dados?.settings?.late_tolerance_minutes ?? 10
  const podeFalta = emCurso && agora.getTime() >= new Date(emCurso.start_at).getTime() + tolerancia * 60000

  async function registarFalta(m) {
    if (!window.confirm(`Registar falta de ${m.client_name}? Fica no histórico do cliente.`)) return
    setErroAcao('')
    const { error } = await supabase.rpc('admin_mark_no_show', { p_id: m.id })
    if (error) setErroAcao(error.message)
    recarregar()
  }

  const servicoDe = (m) => m.appointment_services.map((s) => s.service_name).join(' + ')
  const abrir = (m) => navigate(`/admin/agenda?m=${m.id}`)

  return (
    <>
      <CabecalhoPagina eyebrow={dataPorExtenso(agora)} titulo={nome ? `${saudacao(agora)}, ${nome}` : saudacao(agora)} poste>
        {dados && (
          <div className="flex gap-7">
            <Contador valor={validas.length} label="marcações" />
            <Contador valor={concluidas} label="concluídas" />
            <Contador valor={porAtender} label="por atender" />
          </div>
        )}
        <Link to="/admin/agenda?nova=1" className="btn-primary">
          + Nova marcação
        </Link>
      </CabecalhoPagina>

      {erro && <p className="mb-4 text-sm text-warn" role="alert">{erro}</p>}
      {erroAcao && <p className="mb-4 text-sm text-warn" role="alert">{erroAcao}</p>}

      {!dados ? (
        !erro && <Carregando />
      ) : (
        <div className="grid gap-7 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* Marcações do dia */}
          <section className="card">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="card-title">Marcações do dia</h2>
              <Link to="/admin/agenda" className="text-[13px] text-gold-2 hover:underline">
                Ver agenda →
              </Link>
            </div>
            {comEstado.length === 0 ? (
              <p className="py-6 text-sm text-muted">Ainda não há marcações para hoje.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {comEstado.map((m) => {
                  const apagada = ['completed', 'cancelled', 'no_show'].includes(m.estado)
                  const faltas = resumoDoCliente(dados.historico, m.client_id, m.start_at).faltas
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => abrir(m)}
                        className={`grid w-full grid-cols-[56px_10px_1fr_auto] items-center gap-3.5 rounded-lg px-3 py-3 text-left hover:bg-hover sm:grid-cols-[56px_10px_1fr_auto_110px] ${
                          m.estado === 'in_progress' ? 'bg-gold-2/8' : ''
                        } ${apagada ? 'opacity-55' : ''}`}
                      >
                        <span className="text-[15px] font-semibold tabular-nums">{partesLisboa(m.start_at).hora}</span>
                        <span className={`h-2 w-2 rounded-full ${COR_PONTO[m.estado]}`} />
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-semibold">
                            {m.client_name}
                            {faltas >= limiteFaltas && <span className="ml-1.5" title={`${faltas} faltas`}>⚠️</span>}
                          </span>
                          <span className="block truncate text-[13px] text-muted">
                            {servicoDe(m)} · {m.total_duration_minutes} min
                          </span>
                        </span>
                        <span className="text-sm text-price">{formatarEuros(m.total_price_cents)}</span>
                        <span className={`col-span-4 text-xs sm:col-span-1 sm:text-right ${ESTADOS[m.estado].cor}`}>{descreverEstado(m, agora)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <div className="flex flex-col gap-7">
            {/* Em curso — "Registar falta" em destaque (2.8, janela curta da 2.3) */}
            {emCurso && (
              <section className="card card-gold flex flex-col gap-3">
                <div className="flex justify-between">
                  <span className="eyebrow tracking-[0.16em]">Em curso</span>
                  <span className="text-[13px] text-muted">até {partesLisboa(emCurso.end_at).hora}</span>
                </div>
                <p className="text-[18px] font-semibold">{emCurso.client_name}</p>
                <p className="text-sm text-muted">{servicoDe(emCurso)} · {formatarEuros(emCurso.total_price_cents)}</p>
                <div className="flex gap-2.5">
                  {podeFalta ? (
                    <button type="button" onClick={() => registarFalta(emCurso)} className="btn-gold flex-1">
                      Registar falta
                    </button>
                  ) : (
                    <p className="flex-1 text-xs text-muted-2">“Registar falta” aparece {tolerancia} min depois do início.</p>
                  )}
                  <button type="button" onClick={() => abrir(emCurso)} className="btn-ghost flex-1">Abrir</button>
                </div>
              </section>
            )}

            {/* Próxima marcação */}
            <section className="card card-gold flex flex-col gap-3.5">
              <div className="flex justify-between">
                <span className="eyebrow tracking-[0.16em]">Próxima marcação</span>
                {proxima && <span className="text-[13px] text-muted">{falta(new Date(proxima.start_at) - agora)}</span>}
              </div>
              {proxima ? (
                <>
                  <div className="flex items-baseline gap-4">
                    <span className="font-serif text-[56px] leading-none font-semibold text-gold">{partesLisboa(proxima.start_at).hora}</span>
                    <div className="min-w-0">
                      <b className="block truncate text-[18px] font-semibold">{proxima.client_name}</b>
                      <span className="text-sm text-muted">
                        {servicoDe(proxima)} · {proxima.total_duration_minutes} min · {formatarEuros(proxima.total_price_cents)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[13px] text-muted">{metaCliente(resumoDoCliente(dados.historico, proxima.client_id, proxima.start_at), agora)}</p>
                  <div className="flex gap-2.5">
                    <Link to={`/admin/clientes/${proxima.client_id}`} className="btn-gold flex-1 text-center">Ver ficha</Link>
                    {proxima.clients?.phone_e164 ? (
                      <a
                        href={linkWhatsapp(
                          proxima.clients.phone_e164,
                          `Olá ${proxima.client_name}, lembrete da sua marcação no ${dados.settings.business_name}: ${formatarInstante(proxima.start_at)} — ${servicoDe(proxima)}.`
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost flex-1 text-center"
                      >
                        Enviar lembrete
                      </a>
                    ) : (
                      <button type="button" disabled className="btn-ghost flex-1" title="Cliente sem telemóvel">Enviar lembrete</button>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">Sem mais marcações hoje.</p>
              )}
            </section>

            {/* Pendências = notificações não lidas (2.9) */}
            <section className="card">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="card-title">Pendências</h2>
                {dados.naoLidas > 0 && (
                  <Link to="/admin/notificacoes" className="text-[13px] text-gold-2 hover:underline">
                    {dados.naoLidas} por ler →
                  </Link>
                )}
              </div>
              {dados.notificacoes.length === 0 ? (
                <p className="border-t border-line-soft pt-3 text-sm text-muted">Sem pendências.</p>
              ) : (
                dados.notificacoes.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 border-t border-line-soft py-2.5">
                    <i className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-gold-2" />
                    <div className="min-w-0 flex-1">
                      <b className="block text-sm font-semibold">{n.title}</b>
                      <span className="text-[13px] text-muted">{n.body}</span>
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
        </div>
      )}
    </>
  )
}

function Contador({ valor, label }) {
  return (
    <div className="flex flex-col items-end">
      <b className="font-serif text-[34px] leading-none font-semibold">{valor}</b>
      <span className="text-xs text-muted">{label}</span>
    </div>
  )
}
