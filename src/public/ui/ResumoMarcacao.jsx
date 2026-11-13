import { formatarEuros } from '../../lib/dinheiro'

// Resumo da marcação (revisão, sucesso e link pessoal): serviço, dia, hora, duração e preço.
export default function ResumoMarcacao({ servico, dataTexto, hora, duracao, precoCentimos, destaque = false, children }) {
  return (
    <div className={`card flex flex-col gap-4 ${destaque ? 'card-gold' : 'bg-bg/70'}`}>
      <div className="flex items-baseline gap-4">
        <span className="font-serif text-[52px] leading-none font-semibold text-gold">{hora}</span>
        <div className="min-w-0">
          <p className="text-[16px] font-semibold">{dataTexto}</p>
          <p className="text-sm text-muted">
            {servico} · {duracao} min
          </p>
        </div>
      </div>
      {precoCentimos != null && (
        <div className="flex items-baseline justify-between border-t border-line-soft pt-3">
          <span className="text-sm text-muted">Preço</span>
          <span className="font-serif text-[30px] leading-none font-semibold">{formatarEuros(precoCentimos)}</span>
        </div>
      )}
      {children}
    </div>
  )
}
