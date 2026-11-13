import { ChevronLeft, ChevronRight } from 'lucide-react'
import { diaSemanaDe, somarDias } from '../../lib/datas'

const DIAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// Passo 2 — calendário mensal (semana a começar à segunda). Só os dias de
// `disponiveis` são escolhíveis; os restantes (domingos, feriados, sem vagas,
// fora dos 30 dias) aparecem desativados (2.1 passo 3).
export default function Calendario({ mes, disponiveis, selecionado, onEscolher, onMudarMes, podeAnterior, podeSeguinte }) {
  const primeiro = `${mes}-01`
  const [ano, m] = mes.split('-').map(Number)
  const diasNoMes = new Date(Date.UTC(ano, m, 0)).getUTCDate()
  const vazios = diaSemanaDe(primeiro) - 1
  const dias = Array.from({ length: diasNoMes }, (_, i) => somarDias(primeiro, i))

  return (
    <div className="rounded-xl border border-line bg-bg/70 p-4 backdrop-blur-[1px]">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="Mês anterior" disabled={!podeAnterior} onClick={() => onMudarMes(-1)} className="rounded-lg p-2 text-muted hover:bg-hover disabled:opacity-25">
          <ChevronLeft size={18} strokeWidth={1.8} aria-hidden />
        </button>
        <p className="font-serif text-xl font-semibold capitalize">
          {MESES[m - 1]} {ano}
        </p>
        <button type="button" aria-label="Mês seguinte" disabled={!podeSeguinte} onClick={() => onMudarMes(1)} className="rounded-lg p-2 text-muted hover:bg-hover disabled:opacity-25">
          <ChevronRight size={18} strokeWidth={1.8} aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-2">
        {DIAS.map((d, i) => (
          <span key={i} className="py-1">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: vazios }, (_, i) => (
          <span key={`v${i}`} />
        ))}
        {dias.map((d) => {
          const livre = disponiveis.has(d)
          const ativo = d === selecionado
          return (
            <button
              key={d}
              type="button"
              disabled={!livre}
              onClick={() => onEscolher(d)}
              className={`aspect-square rounded-lg text-[15px] tabular-nums transition-colors ${
                ativo
                  ? 'bg-gold font-bold text-on-gold'
                  : livre
                    ? 'border border-line-gold text-fg hover:bg-gold-2/12'
                    : 'text-muted-2/50'
              }`}
            >
              {Number(d.slice(8))}
            </button>
          )
        })}
      </div>
    </div>
  )
}
