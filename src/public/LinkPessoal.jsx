import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarPlus, MessageCircle, Repeat } from 'lucide-react'
import Carregando from '../components/Carregando'
import ResumoMarcacao from './ui/ResumoMarcacao'
import AtivarLembretes from './ui/AtivarLembretes'
import { MENSAGENS, cancelarMarcacao, diaSemanaPlural, obterInfo, verMarcacao } from './publicApi'
import { dataPorExtenso, formatarData, instanteLisboa, partesLisboa } from '../lib/datas'
import { linkWhatsapp } from '../lib/telefone'

// Link pessoal /m/:código (6.4, Especificação 2.6, Arquitetura 3.9 §2):
// ver a marcação sempre; cancelar só confirmada e até cancel_notice_minutes antes
// (2 h); depois disso, "Contacte o barbeiro". O código nunca sai desta página
// (Referrer-Policy na Vercel) e só o servidor o confirma (get_booking).

const ESTADOS = {
  confirmed: { texto: 'Confirmada', cor: 'text-ok' },
  in_progress: { texto: 'Em curso', cor: 'text-gold' },
  completed: { texto: 'Concluída', cor: 'text-muted' },
  cancelled: { texto: 'Cancelada', cor: 'text-warn' },
  no_show: { texto: 'Falta registada', cor: 'text-warn' },
}

// "terça, 17 nov, às 08:00"
function prazoPorExtenso(instante) {
  const { data, hora } = partesLisboa(instante)
  return `${formatarData(data, { ano: false })}, às ${hora}`
}

export default function LinkPessoal() {
  const { token } = useParams()
  const [marcacao, setMarcacao] = useState(null) // resposta de get_booking
  const [info, setInfo] = useState(null)
  const [aConfirmar, setAConfirmar] = useState(false)
  const [aCancelar, setACancelar] = useState(false)
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    const vivo = { atual: true }
    verMarcacao(token).then((r) => vivo.atual && setMarcacao(r))
    obterInfo()
      .then((i) => vivo.atual && setInfo(i))
      .catch(() => vivo.atual && setInfo({}))
    return () => {
      vivo.atual = false
    }
  }, [token])

  if (!marcacao) return <Carregando />

  if (!marcacao.ok) {
    return (
      <section className="card bg-bg/70 text-center">
        <h1 className="font-serif text-[30px] leading-tight font-semibold">
          {marcacao.error === 'NOT_FOUND' ? 'Link não encontrado' : 'Não foi possível abrir'}
        </h1>
        <p className="mt-2 text-sm text-muted">{MENSAGENS[marcacao.error] ?? MENSAGENS.NETWORK}</p>
        <Link to="/marcar" className="btn-primary mt-6 block w-full">
          Marcar horário
        </Link>
      </section>
    )
  }

  const m = marcacao
  const estado = ESTADOS[m.status] ?? { texto: m.status, cor: 'text-muted' }
  const primeiroNome = m.client_name?.split(' ')[0]
  const ativa = m.status === 'confirmed'
  const quando = `${formatarData(m.date_local, { ano: false })} às ${m.time_local}`
  const whatsapp = info?.whatsapp_phone
    ? linkWhatsapp(info.whatsapp_phone, `Olá! É sobre a minha marcação de ${m.service_name} para ${quando}.`)
    : null

  async function cancelar() {
    setACancelar(true)
    setAviso(null)
    const r = await cancelarMarcacao(token)
    setACancelar(false)
    setAConfirmar(false)
    if (r.ok) {
      setMarcacao(r)
      return
    }
    setAviso(MENSAGENS[r.error] ?? MENSAGENS.NETWORK)
    // O estado mudou entretanto (prazo passou, já cancelada): mostra o atual.
    if (r.error === 'TOO_LATE_TO_CANCEL' || r.error === 'ALREADY_CANCELLED') {
      const atual = await verMarcacao(token)
      if (atual.ok) setMarcacao(atual)
    }
  }

  return (
    <>
      <p className="eyebrow">A sua marcação</p>
      <h1 className="mt-1 mb-5 font-serif text-[34px] leading-tight font-semibold">{primeiroNome ? `Olá, ${primeiroNome}` : 'Olá'}</h1>

      <ResumoMarcacao
        servico={m.service_name}
        dataTexto={dataPorExtenso(instanteLisboa(m.date_local, '12:00'))}
        hora={m.time_local}
        duracao={m.duration_minutes}
        precoCentimos={m.price_cents}
        destaque={ativa}
      >
        <p className={`text-sm font-semibold ${estado.cor}`}>
          {estado.texto}
          {m.status === 'cancelled' && m.cancelled_by === 'barber' && <span className="font-normal text-muted"> pelo barbeiro</span>}
        </p>
        {m.weekly && ['pending', 'active'].includes(m.weekly.status) && (
          <p className="flex items-center gap-1.5 text-sm text-gold-2">
            <Repeat size={14} strokeWidth={2} aria-hidden />
            Semanal: {diaSemanaPlural(m.weekly.weekday)} às {m.weekly.time_local}
            <span className="text-muted">· {m.weekly.status === 'active' ? 'ativa' : 'à espera do barbeiro'}</span>
          </p>
        )}
      </ResumoMarcacao>
      {(m.status === 'confirmed' || m.weekly?.status === 'active') && <AtivarLembretes codigo={token} />}
      {m.weekly?.status === 'active' && (
        <p className="mt-3 text-xs text-muted-2">Para faltar a uma semana ou deixar a marcação semanal, fale com o barbeiro.</p>
      )}

      {aviso && (
        <div role="alert" className="mt-5 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          {aviso}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2.5">
        {/* Cancelar: só dentro do prazo (1.5, 2.6), com confirmação */}
        {m.can_cancel && !aConfirmar && (
          <>
            <button type="button" onClick={() => setAConfirmar(true)} className="btn-ghost text-warn">
              Cancelar marcação
            </button>
            <p className="text-center text-xs text-muted-2">Pode cancelar até {prazoPorExtenso(m.cancel_until)}.</p>
          </>
        )}
        {m.can_cancel && aConfirmar && (
          <div className="card border-warn/40 bg-bg/70">
            <p className="text-sm font-semibold">Cancelar esta marcação?</p>
            <p className="mt-1 text-xs text-muted">O horário fica livre para outra pessoa. Não é possível desfazer.</p>
            <div className="mt-4 flex gap-2.5">
              <button type="button" onClick={() => setAConfirmar(false)} disabled={aCancelar} className="btn-ghost flex-1">
                Manter
              </button>
              <button
                type="button"
                onClick={cancelar}
                disabled={aCancelar}
                className="flex-1 rounded-lg bg-warn p-[11px] text-[13px] font-bold text-black disabled:opacity-60"
              >
                {aCancelar ? 'A cancelar…' : 'Sim, cancelar'}
              </button>
            </div>
          </div>
        )}

        {/* Confirmada mas já dentro das 2 h: só pelo barbeiro */}
        {ativa && !m.can_cancel && (
          <p className="text-center text-sm text-muted">
            Já não é possível cancelar online (faltam menos de 2 horas). Se não puder vir, avise o barbeiro.
          </p>
        )}

        {whatsapp && (m.status === 'confirmed' || m.status === 'in_progress') && (
          <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-ghost flex items-center justify-center gap-2">
            <MessageCircle size={16} strokeWidth={1.8} aria-hidden /> Falar com o barbeiro
          </a>
        )}

        {!ativa && m.status !== 'in_progress' && (
          <Link to="/marcar" className="btn-primary flex items-center justify-center gap-2">
            <CalendarPlus size={16} strokeWidth={1.8} aria-hidden /> Marcar novo horário
          </Link>
        )}
        {ativa && (
          <Link to="/marcar" className="mt-2 text-center text-sm text-gold-2 underline">
            Marcar outro horário
          </Link>
        )}
      </div>
    </>
  )
}
