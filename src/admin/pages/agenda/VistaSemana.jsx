import { formatarData, hojeLisboa, partesLisboa, somarDias } from '../../../lib/datas'
import { estadoEfetivo } from '../../../lib/estados'
import { doDia, janelasDoDia } from './agendaApi'

// Vista semanal (2.2): resumo de cada dia; tocar num dia abre a vista diária.
export default function VistaSemana({ segunda, periodo, onEscolherDia }) {
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i))
  const hoje = hojeLisboa()

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {dias.map((d) => {
        const { nota, janelas } = janelasDoDia(d, periodo.config)
        const ativas = doDia(periodo.marcacoes, d).filter((m) => !['cancelled', 'no_show'].includes(estadoEfetivo(m)))
        const bloqueios = doDia(periodo.bloqueios, d)
        return (
          <button
            key={d}
            type="button"
            onClick={() => onEscolherDia(d)}
            className={`card flex flex-col gap-2 p-4 text-left transition-colors hover:border-line-gold ${d === hoje ? 'card-gold' : ''}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-serif text-xl font-semibold capitalize">{formatarData(d, { ano: false })}</span>
              <span className="text-xs text-muted">{ativas.length} {ativas.length === 1 ? 'marcação' : 'marcações'}</span>
            </div>
            {janelas.length === 0 && <span className="text-xs text-gold-2">{nota ?? 'Fechado'}</span>}
            {bloqueios.length > 0 && <span className="text-xs text-muted-2">{bloqueios.length} bloqueio(s)</span>}
            <ul className="flex flex-col gap-1 text-[13px]">
              {ativas.slice(0, 6).map((m) => (
                <li key={m.id} className="flex gap-2">
                  <span className="tabular-nums text-muted">{partesLisboa(m.start_at).hora}</span>
                  <span className="truncate">{m.client_name}</span>
                </li>
              ))}
              {ativas.length > 6 && <li className="text-xs text-muted-2">+ {ativas.length - 6}</li>}
            </ul>
          </button>
        )
      })}
    </div>
  )
}
