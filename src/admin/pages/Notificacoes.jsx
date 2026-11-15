import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellRing, CalendarPlus, CalendarX, CheckCheck, ClipboardList, FlaskConical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { hojeLisboa, partesLisboa, somarDias, formatarData } from '../../lib/datas'
import Carregando from '../../components/Carregando'
import CabecalhoPagina from '../CabecalhoPagina'
import { SELECT_NOTIFICACAO, atualizarNaoLidas, destinoDe, marcarComoLidas, marcarTodasComoLidas, useNaoLidas } from '../naoLidas'

// Notificações (7.4, Especificação 2.9 parte 2): lista dos últimos 30 dias,
// não lidas em destaque; tocar abre a marcação (o resumo abre a agenda de hoje)
// e marca como lida; "Marcar todas como lidas". O contador é o mesmo da
// navegação, do Início e do número no ícone da app.

const ICONES = {
  new_booking: CalendarPlus,
  client_cancelled: CalendarX,
  daily_summary: ClipboardList,
  reminder: BellRing,
  test: FlaskConical,
}

function grupoDoDia(instante) {
  const dia = partesLisboa(instante).data
  const hoje = hojeLisboa()
  if (dia === hoje) return 'Hoje'
  if (dia === somarDias(hoje, -1)) return 'Ontem'
  const t = formatarData(dia, { ano: false })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export default function Notificacoes() {
  const navigate = useNavigate()
  const naoLidas = useNaoLidas()
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState('')
  const [aMarcar, setAMarcar] = useState(false)

  // Ao abrir a página, o contador é lido de novo (fica igual à lista).
  useEffect(() => {
    atualizarNaoLidas()
  }, [])

  // Volta a ler a lista quando o contador muda (chegou uma nova ou alguma foi lida).
  useEffect(() => {
    const vivo = { atual: true }
    supabase
      .from('notifications')
      .select(SELECT_NOTIFICACAO)
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data, error }) => {
        if (!vivo.atual) return
        if (error) setErro('Não foi possível carregar as notificações.')
        else setLista(data)
      })
    return () => {
      vivo.atual = false
    }
  }, [naoLidas])

  async function abrir(n) {
    if (!n.read_at) {
      setLista((l) => l.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)))
      await marcarComoLidas([n.id])
    }
    const destino = destinoDe(n)
    if (destino) navigate(destino)
  }

  async function lerTodas() {
    setAMarcar(true)
    await marcarTodasComoLidas()
    setAMarcar(false)
  }

  // Agrupar por dia (Hoje, Ontem, "ter, 10 nov"…)
  const grupos = []
  for (const n of lista ?? []) {
    const g = grupoDoDia(n.created_at)
    if (grupos.at(-1)?.titulo !== g) grupos.push({ titulo: g, itens: [] })
    grupos.at(-1).itens.push(n)
  }

  return (
    <>
      <CabecalhoPagina eyebrow={naoLidas ? `${naoLidas} por ler` : 'Tudo lido'} titulo="Notificações">
        {naoLidas > 0 && (
          <button type="button" onClick={lerTodas} disabled={aMarcar} className="btn-ghost flex items-center gap-2">
            <CheckCheck size={16} strokeWidth={1.8} aria-hidden /> {aMarcar ? 'A marcar…' : 'Marcar todas como lidas'}
          </button>
        )}
      </CabecalhoPagina>

      {erro && <p className="text-sm text-warn" role="alert">{erro}</p>}
      {!lista && !erro && <Carregando />}

      {lista && lista.length === 0 && (
        <section className="card max-w-2xl">
          <p className="text-sm text-muted">Sem notificações nos últimos 30 dias.</p>
        </section>
      )}

      {lista && lista.length > 0 && (
        <div className="flex max-w-2xl flex-col gap-6">
          {grupos.map((g) => (
            <section key={g.titulo}>
              <p className="eyebrow mb-2">{g.titulo}</p>
              <ul className="flex flex-col gap-2">
                {g.itens.map((n) => {
                  const Icone = ICONES[n.type] ?? BellRing
                  const lida = Boolean(n.read_at)
                  const destino = destinoDe(n)
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => abrir(n)}
                        className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                          lida ? 'border-line bg-bg/70 hover:bg-hover' : 'border-line-gold bg-gold-2/8 hover:bg-gold-2/12'
                        } ${destino || !lida ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        <Icone size={18} strokeWidth={1.8} className={`mt-0.5 shrink-0 ${lida ? 'text-muted-2' : 'text-gold'}`} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <b className={`text-sm ${lida ? 'font-semibold text-muted' : 'font-bold'}`}>{n.title}</b>
                            <span className="shrink-0 text-xs text-muted-2 tabular-nums">{partesLisboa(n.created_at).hora}</span>
                          </span>
                          <span className={`mt-0.5 block text-[13px] ${lida ? 'text-muted-2' : 'text-muted'}`}>{n.body}</span>
                        </span>
                        {!lida && <i className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Por ler" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
          <p className="text-xs text-muted-2">As notificações são apagadas automaticamente ao fim de 30 dias.</p>
        </div>
      )}
    </>
  )
}
