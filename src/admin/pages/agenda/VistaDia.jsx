import { Plus } from 'lucide-react'
import { formatarEuros } from '../../../lib/dinheiro'
import { deMinutos, hojeLisboa, partesLisboa, paraMinutos } from '../../../lib/datas'
import { descreverEstado, estadoEfetivo, ESTADOS } from '../../../lib/estados'
import { doDia, janelasDoDia, livresDoDia, minutosNoDia } from './agendaApi'

const NOMES_BLOQUEIO = { slot: 'Bloqueio', day_off: 'Folga', vacation: 'Férias' }
const COR_PONTO = { confirmed: 'bg-ok', in_progress: 'bg-gold', completed: 'bg-muted-2', cancelled: 'bg-muted-2', no_show: 'bg-warn' }

// Vista diária (2.2): marcações, bloqueios e espaços livres por ordem de hora.
// Tocar num espaço livre abre a nova marcação com o dia e a hora preenchidos.
export default function VistaDia({ data, periodo, agora, onAbrir, onNova }) {
  const { nota } = janelasDoDia(data, periodo.config)
  const marcacoes = doDia(periodo.marcacoes, data)
  const bloqueios = doDia(periodo.bloqueios, data)
  const minutoAgora = data === hojeLisboa() ? paraMinutos(partesLisboa(agora).hora) : data < hojeLisboa() ? 24 * 60 : 0

  const linhas = [
    ...marcacoes.map((m) => ({ tipo: 'marcacao', inicio: minutosNoDia(m.start_at, m.end_at, data).inicio, m })),
    ...bloqueios.map((b) => ({ tipo: 'bloqueio', ...minutosNoDia(b.start_at, b.end_at, data), b })),
    ...livresDoDia(data, periodo.config, periodo.marcacoes, periodo.bloqueios)
      .map((l) => ({ tipo: 'livre', inicio: Math.max(l.inicio, Math.ceil(minutoAgora / 5) * 5), fim: l.fim }))
      .filter((l) => l.fim - l.inicio >= 10),
  ].sort((a, b) => a.inicio - b.inicio || (a.tipo === 'livre') - (b.tipo === 'livre'))

  return (
    <section className="card">
      {nota && <p className="mb-3 text-sm text-gold-2">{nota}</p>}
      {linhas.length === 0 ? (
        <p className="py-6 text-sm text-muted">{nota ? 'Sem marcações neste dia.' : 'Sem marcações nem horários livres.'}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {linhas.map((l, i) => {
            if (l.tipo === 'livre')
              return (
                <li key={`l${i}`}>
                  <button
                    type="button"
                    onClick={() => onNova({ data, hora: deMinutos(l.inicio) })}
                    className="flex w-full items-center gap-3.5 rounded-lg border border-dashed border-line-btn px-3 py-2.5 text-left text-sm text-muted hover:border-gold-2 hover:text-gold"
                  >
                    <span className="w-14 font-semibold tabular-nums">{deMinutos(l.inicio)}</span>
                    <span className="flex-1">Livre até {deMinutos(l.fim)}</span>
                    <Plus size={16} strokeWidth={1.8} aria-hidden />
                  </button>
                </li>
              )
            if (l.tipo === 'bloqueio')
              return (
                <li key={l.b.id} className="flex items-center gap-3.5 rounded-lg bg-hover px-3 py-2.5 text-sm text-muted">
                  <span className="w-14 font-semibold tabular-nums">{deMinutos(l.inicio)}</span>
                  <span className="flex-1">
                    {NOMES_BLOQUEIO[l.b.kind]} até {l.fim >= 24 * 60 ? 'ao fim do dia' : deMinutos(l.fim)}
                    {l.b.reason ? ` · ${l.b.reason}` : ''}
                  </span>
                </li>
              )
            const m = l.m
            const estado = estadoEfetivo(m, agora)
            const apagada = estado === 'completed' || estado === 'cancelled' || estado === 'no_show'
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onAbrir(m)}
                  className={`grid w-full grid-cols-[56px_10px_1fr_auto] items-center gap-3.5 rounded-lg px-3 py-3 text-left hover:bg-hover sm:grid-cols-[56px_10px_1fr_auto_120px] ${
                    estado === 'in_progress' ? 'bg-gold-2/8' : ''
                  } ${apagada ? 'opacity-55' : ''} ${m.is_intentional_overlap && !apagada ? 'ring-1 ring-warn/50' : ''}`}
                >
                  <span className="text-[15px] font-semibold tabular-nums">{partesLisboa(m.start_at).hora}</span>
                  <span className={`h-2 w-2 rounded-full ${COR_PONTO[estado]}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{m.client_name}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {m.appointment_services.map((s) => s.service_name).join(' + ')} · {m.total_duration_minutes} min
                      {m.is_intentional_overlap && !apagada ? ' · sobreposição' : ''}
                    </span>
                  </span>
                  <span className="text-sm text-price">{formatarEuros(m.total_price_cents)}</span>
                  <span className={`col-span-4 text-xs sm:col-span-1 sm:text-right ${ESTADOS[estado].cor}`}>{descreverEstado(m, agora)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
