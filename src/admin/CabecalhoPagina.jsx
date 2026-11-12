// Cabeçalho das páginas do painel (handoff): eyebrow + título em serifa,
// ações à direita e, só no Início, a divisória "poste de barbeiro".
export default function CabecalhoPagina({ eyebrow, titulo, children, poste = false }) {
  return (
    <header className="mb-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="mt-1 font-serif text-[34px] leading-[1.05] font-semibold sm:text-[48px]">
            {titulo}
          </h1>
        </div>
        {children && <div className="flex items-center gap-8">{children}</div>}
      </div>
      {poste && <div className="pole" />}
    </header>
  )
}
