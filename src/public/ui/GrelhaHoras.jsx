// Passo 3 — horários livres do dia (grelha + encaixe, 2.4), agrupados por manhã/tarde.
export default function GrelhaHoras({ horas, selecionada, onEscolher }) {
  const grupos = [
    ['Manhã', horas.filter((h) => h < '13:00')],
    ['Tarde', horas.filter((h) => h >= '13:00')],
  ].filter(([, lista]) => lista.length)

  return (
    <div className="flex flex-col gap-5">
      {grupos.map(([nome, lista]) => (
        <div key={nome}>
          <p className="mb-2 text-xs tracking-[0.14em] text-muted-2 uppercase">{nome}</p>
          <div className="grid grid-cols-4 gap-2">
            {lista.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onEscolher(h)}
                className={`rounded-lg py-2.5 text-[15px] font-semibold tabular-nums transition-colors ${
                  h === selecionada ? 'bg-gold text-on-gold' : 'border border-line-btn bg-bg/70 hover:border-gold-2'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
