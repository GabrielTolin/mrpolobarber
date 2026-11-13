import { ChevronRight, Clock } from 'lucide-react'

// Passo 1 — serviços ativos: nome, descrição, duração. SEM preço (2.1 / 2.7).
export default function ListaServicos({ servicos, selecionado, onEscolher }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {servicos.map((s) => {
        const ativo = s.id === selecionado
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onEscolher(s)}
              className={`flex w-full items-center gap-4 rounded-xl border bg-bg/70 px-4 py-4 text-left backdrop-blur-[1px] transition-colors ${
                ativo ? 'border-gold bg-gold-2/8' : 'border-line hover:border-line-gold'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold">{s.name}</p>
                {s.description && <p className="mt-0.5 text-[13px] text-muted">{s.description}</p>}
                <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-2">
                  <Clock size={13} strokeWidth={1.8} aria-hidden /> {s.duration_minutes} min
                </p>
              </div>
              <ChevronRight className={ativo ? 'text-gold' : 'text-muted-2'} size={18} strokeWidth={1.8} aria-hidden />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
