import { ChevronLeft } from 'lucide-react'

// Cabeçalho de cada passo do fluxo de marcação: "Passo 2 de 5" + título em serifa.
export default function Passo({ numero, total = 5, titulo, subtitulo, onVoltar }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">
          Passo {numero} de {total}
        </p>
        {onVoltar && (
          <button type="button" onClick={onVoltar} className="flex items-center gap-1 text-[13px] text-gold-2 hover:underline">
            <ChevronLeft size={14} strokeWidth={1.8} aria-hidden /> Voltar
          </button>
        )}
      </div>
      <h1 className="mt-1 font-serif text-[34px] leading-[1.05] font-semibold">{titulo}</h1>
      {subtitulo && <p className="mt-1.5 text-sm text-muted">{subtitulo}</p>}
      <div className="mt-4 flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i < numero ? 'bg-gold' : 'bg-line-btn'}`} />
        ))}
      </div>
    </div>
  )
}
