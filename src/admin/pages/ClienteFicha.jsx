import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatarEuros } from '../../lib/dinheiro'
import { formatarData, formatarInstante, partesLisboa } from '../../lib/datas'
import { descreverEstado, estadoEfetivo, ESTADOS, ORIGENS } from '../../lib/estados'
import { formatarTelefone, linkWhatsapp } from '../../lib/telefone'
import Carregando from '../../components/Carregando'
import CabecalhoPagina from '../CabecalhoPagina'
import ClienteForm from './clientes/ClienteForm'
import { resumoCliente } from './clientes/clientesApi'

// Ficha do cliente (Especificação 2.2, 2.10; Requisitos 1.6, 1.8).
export default function ClienteFicha() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(null)
  const [limite, setLimite] = useState(2)
  const [erro, setErro] = useState('')
  const [editar, setEditar] = useState(false)
  const [notas, setNotas] = useState('')
  const [notasOk, setNotasOk] = useState(false)

  const carregar = useCallback(async () => {
    const [c, s] = await Promise.all([
      supabase
        .from('clients')
        .select(
          '*, appointments(id, start_at, end_at, status, source, total_price_cents, cancelled_by, cancelled_late, client_name, appointment_services(service_name))'
        )
        .eq('id', id)
        .order('start_at', { referencedTable: 'appointments', ascending: false })
        .maybeSingle(),
      supabase.from('settings').select('no_show_flag_threshold').eq('id', 1).single(),
    ])
    if (c.error) return setErro('Não foi possível carregar o cliente.')
    if (!c.data) return setErro('Cliente não encontrado.')
    setCliente(c.data)
    setNotas(c.data.notes ?? '')
    if (s.data) setLimite(s.data.no_show_flag_threshold)
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar()
  }, [carregar])

  async function atualizar(campos) {
    const { error } = await supabase.from('clients').update(campos).eq('id', id)
    if (error) return { erro: 'Não foi possível gravar.' }
    await carregar()
    return null
  }

  async function gravarEdicao(campos) {
    const r = await atualizar(campos)
    if (!r) setEditar(false)
    return r
  }

  async function alternarBloqueio() {
    const bloquear = !cliente.is_blocked
    if (
      bloquear &&
      !window.confirm(`Bloquear ${cliente.name}? Deixa de conseguir marcar online (a página pede para contactar por WhatsApp).`)
    )
      return
    const r = await atualizar({ is_blocked: bloquear })
    if (r) setErro(r.erro)
  }

  async function gravarNotas() {
    setNotasOk(false)
    const r = await atualizar({ notes: notas.trim() || null })
    if (r) setErro(r.erro)
    else setNotasOk(true)
  }

  async function apagar() {
    if (!window.confirm(`Apagar ${cliente.name}? Esta ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) return setErro('Não foi possível apagar (o cliente tem marcações).')
    navigate('/admin/clientes')
  }

  if (!cliente)
    return (
      <>
        <Voltar />
        {erro ? <p className="text-sm text-warn">{erro}</p> : <Carregando />}
      </>
    )

  const r = resumoCliente(cliente.appointments)
  const comFaltas = r.faltas >= limite

  return (
    <>
      <Voltar />
      <CabecalhoPagina eyebrow="Cliente" titulo={cliente.name} />

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="flex flex-col gap-7">
          {editar ? (
            <ClienteForm cliente={cliente} onGravar={gravarEdicao} onCancelar={() => setEditar(false)} />
          ) : (
            <section className="card flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px]">
                    {cliente.phone_e164 ? formatarTelefone(cliente.phone_e164) : <span className="text-muted-2">Sem telemóvel</span>}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className={`rounded-md px-2 py-1 ${cliente.is_regular ? 'bg-gold-2/12 text-gold' : 'bg-hover text-muted'}`}>
                      {cliente.is_regular ? 'Habitual / local' : 'Visitante'}
                    </span>
                    {cliente.is_blocked && <span className="rounded-md bg-warn/10 px-2 py-1 text-warn">Bloqueado online</span>}
                    {comFaltas && <span className="rounded-md bg-warn/10 px-2 py-1 text-warn">⚠️ {r.faltas} faltas</span>}
                  </div>
                </div>
                <button type="button" onClick={() => setEditar(true)} aria-label="Editar" className="rounded-lg p-2 text-muted hover:bg-hover hover:text-fg">
                  <Pencil size={16} strokeWidth={1.8} aria-hidden />
                </button>
              </div>

              {cliente.phone_e164 && (
                <a href={linkWhatsapp(cliente.phone_e164, `Olá ${cliente.name}, `)} target="_blank" rel="noreferrer" className="btn-ghost flex w-fit items-center gap-2 px-4">
                  <MessageCircle size={16} strokeWidth={1.8} aria-hidden /> WhatsApp
                </a>
              )}

              <div className="grid grid-cols-3 gap-3 border-t border-line-soft pt-4 text-center">
                <Numero valor={r.realizadas} label={r.realizadas === 1 ? 'visita' : 'visitas'} />
                <Numero valor={r.faltas} label={r.faltas === 1 ? 'falta' : 'faltas'} aviso={comFaltas} />
                <Numero valor={r.tardios} label="canc. tardios" />
              </div>
              <p className="text-[13px] text-muted">
                {r.ultima ? `Última visita: ${formatarData(partesLisboa(r.ultima).data)}` : 'Ainda sem visitas'}
                {` · Cliente desde ${formatarData(partesLisboa(cliente.created_at).data)}`}
              </p>
            </section>
          )}

          <section className="card flex flex-col gap-3">
            <h2 className="card-title">Notas internas</h2>
            <textarea
              value={notas}
              onChange={(e) => {
                setNotasOk(false)
                setNotas(e.target.value)
              }}
              rows={4}
              placeholder="Só o barbeiro vê (ex.: prefere máquina 2 dos lados)"
              className="field resize-y"
            />
            {notasOk && <p className="text-sm text-ok">Notas gravadas.</p>}
            <button type="button" onClick={gravarNotas} className="btn-ghost w-fit px-5">
              Gravar notas
            </button>
          </section>

          <section className="card flex flex-col gap-3">
            <h2 className="card-title">Marcação online</h2>
            <p className="text-sm text-muted">
              {cliente.is_blocked
                ? 'Este cliente não consegue marcar online. A página pede-lhe para contactar por WhatsApp.'
                : 'O cliente pode marcar online normalmente.'}
            </p>
            <button type="button" onClick={alternarBloqueio} className="btn-ghost w-fit px-5">
              {cliente.is_blocked ? 'Desbloquear' : 'Bloquear marcação online'}
            </button>
          </section>

          {erro && <p className="text-sm text-warn" role="alert">{erro}</p>}

          {cliente.appointments.length === 0 && (
            <button type="button" onClick={apagar} className="w-fit text-sm text-muted-2 hover:text-warn">
              Apagar cliente
            </button>
          )}
        </div>

        <section className="card">
          <h2 className="card-title mb-4">Histórico</h2>
          {cliente.appointments.length === 0 ? (
            <p className="text-sm text-muted">Ainda sem marcações.</p>
          ) : (
            <ul className="flex flex-col">
              {cliente.appointments.map((m) => {
                const estado = estadoEfetivo(m)
                return (
                  <li key={m.id} className="flex items-center gap-3 border-t border-line-soft py-3 first:border-t-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold tabular-nums">{formatarInstante(m.start_at)}</p>
                      <p className="text-[13px] text-muted">
                        {m.appointment_services.map((s) => s.service_name).join(' + ')} · {ORIGENS[m.source]}
                      </p>
                    </div>
                    <span className="text-sm text-price">{formatarEuros(m.total_price_cents)}</span>
                    <span className={`w-28 text-right text-xs ${ESTADOS[estado].cor}`}>{descreverEstado(m)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

function Voltar() {
  return (
    <Link to="/admin/clientes" className="mb-4 flex w-fit items-center gap-1 text-[13px] text-gold-2 hover:underline">
      <ArrowLeft size={14} strokeWidth={1.8} aria-hidden /> Clientes
    </Link>
  )
}

function Numero({ valor, label, aviso }) {
  return (
    <div>
      <p className={`font-serif text-[34px] leading-none font-semibold ${aviso ? 'text-warn' : ''}`}>{valor}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  )
}
