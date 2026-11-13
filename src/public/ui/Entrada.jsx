import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, Clock, MapPin, MessageCircle, Scissors } from 'lucide-react'

const ICONE = { size: 16, strokeWidth: 1.8, 'aria-hidden': true }
const BRILHO = { textShadow: '0 0 36px rgba(227, 185, 85, 0.45)' }

// Página de entrada (landing) — direção da referência 2 do Gabriel: ecrã inteiro
// com foto de fundo, título grande a dourado com brilho, botão de marcar no topo
// e destaques em baixo. Curta e direta: sem cabeçalho/risca do layout e sem as
// caixinhas do passo a passo (essas só aparecem depois de "Marcar horário").
// Primeiro telemóvel, depois ecrã grande (≥ 1024 px). Sem preços (2.7).
export default function Entrada({ nome, barbeiro, morada, mapa, whatsapp, horario, resumoHorario, foto, onMarcar }) {
  return (
    <div className="min-h-svh bg-bg text-fg">
      {/* ── Herói: ocupa o ecrã todo ── */}
      <section className="relative isolate flex min-h-svh flex-col overflow-hidden">
        {/* Fundo: foto do barbeiro (quando houver) ou luz quente + logótipo */}
        {foto ? (
          <img src={foto} alt={`${barbeiro} a trabalhar`} className="absolute inset-0 -z-20 h-full w-full object-cover" />
        ) : (
          <div aria-hidden className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_70%_20%,#3a2f17_0%,#15120c_45%,#0a0907_80%)] lg:bg-[radial-gradient(ellipse_at_75%_40%,#3a2f17_0%,#15120c_45%,#0a0907_80%)]">
            <img
              src="/brand-logo.webp"
              alt=""
              className="absolute top-[9%] left-1/2 w-[80vw] mix-blend-lighten max-w-[420px] -translate-x-1/2 opacity-25 lg:top-1/2 lg:right-[6%] lg:left-auto lg:w-[42vw] lg:max-w-[620px] lg:translate-x-0 lg:-translate-y-1/2 lg:opacity-35"
            />
            <span className="absolute right-4 bottom-3 text-[10px] tracking-[0.14em] text-muted-2 uppercase">Foto principal (provisório)</span>
          </div>
        )}
        {/* Escurecer para o texto ler bem: de baixo no telemóvel, da esquerda no ecrã grande */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/70 to-black/10 lg:bg-gradient-to-r lg:from-black/95 lg:via-black/60 lg:to-transparent" />

        {/* Barra do topo: logótipo + Marcar */}
        <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 pt-4 lg:px-10 lg:pt-6">
          <img src="/brand-logo.webp" alt={nome} className="h-14 w-auto mix-blend-lighten lg:h-16" />
          <button
            type="button"
            onClick={onMarcar}
            className="btn-primary px-4 py-2.5 text-[13px] shadow-[0_0_24px_rgba(227,185,85,0.35)] lg:px-6 lg:text-sm"
          >
            Marcar
          </button>
        </header>

        {/* Texto principal: em baixo no telemóvel, ao centro à esquerda no ecrã grande */}
        <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-end px-5 pb-8 lg:justify-center lg:px-10 lg:pb-20">
          <div className="lg:max-w-[780px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-line-gold bg-black/50 px-3 py-1.5 text-xs text-fg/90 backdrop-blur">
              <Scissors size={13} strokeWidth={1.8} className="text-gold" aria-hidden /> Barbearia em Albufeira
            </span>

            <h1 style={BRILHO} className="mt-4 text-[44px] leading-[0.98] font-extrabold tracking-tight text-gold lg:text-[92px]">
              O seu estilo,
              <br />
              feito ao detalhe.
            </h1>

            <p className="mt-4 max-w-[440px] text-[15px] leading-relaxed text-fg/75 lg:max-w-[520px] lg:text-[17px]">
              Corte, barba e cuidado masculino com o {barbeiro}. Marque online em 1 minuto e fica confirmado na hora.
            </p>

            <div className="mt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-5">
              <button type="button" onClick={onMarcar} className="btn-primary py-4 text-[15px] shadow-[0_0_32px_rgba(227,185,85,0.35)] sm:px-10">
                Marcar horário
              </button>
              {mapa && (
                <a href={mapa} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-3 text-[15px] text-fg/85 hover:text-fg">
                  Como chegar <ArrowRight size={16} strokeWidth={1.8} aria-hidden />
                </a>
              )}
            </div>

            {/* Destaques (como os números da referência), com informação real */}
            <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-5 lg:mt-12 lg:max-w-[600px] lg:gap-8">
              {[
                [Clock, resumoHorario?.[0], resumoHorario?.[1]],
                [MapPin, 'Albufeira', 'Algarve'],
                [CalendarCheck, 'Na hora', 'Confirmação online'],
              ].map(([Icone, valor, rotulo]) => (
                <div key={rotulo}>
                  <dt className="flex items-center gap-1.5 text-[15px] font-bold text-fg lg:text-lg">
                    <Icone size={15} strokeWidth={2} className="shrink-0 text-gold" aria-hidden /> {valor}
                  </dt>
                  <dd className="mt-0.5 text-[11px] leading-snug text-muted lg:text-[13px]">{rotulo}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── Horário e morada (único bloco abaixo do herói) ── */}
      <section className="border-t border-line-sidebar bg-black">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-10 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:py-14">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <Clock {...ICONE} /> Horário
            </p>
            <ul className="mt-3 flex flex-col text-sm">
              {horario.map(([dias, horas]) => (
                <li key={dias} className="flex justify-between gap-3 border-t border-line-soft py-2.5 first:border-t-0">
                  <span className="text-muted">{dias}</span>
                  <span className={horas === 'Fechado' ? 'text-muted-2' : ''}>{horas}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow flex items-center gap-2">
              <MapPin {...ICONE} /> Onde estamos
            </p>
            <p className="mt-3 text-lg font-bold">{nome}</p>
            {morada && <p className="mt-1 text-sm text-muted">{morada}</p>}
            <div className="mt-5 flex gap-2.5">
              {mapa && (
                <a href={mapa} target="_blank" rel="noreferrer" className="btn-ghost flex flex-1 items-center justify-center gap-2 lg:flex-none lg:px-6">
                  <MapPin {...ICONE} /> Ver no mapa
                </a>
              )}
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-ghost flex flex-1 items-center justify-center gap-2 lg:flex-none lg:px-6">
                  <MessageCircle {...ICONE} /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-[1200px] border-t border-line-sidebar px-5 py-4 text-xs text-muted-2 lg:px-10">
          <Link to="/privacidade" className="hover:text-muted">
            Política de privacidade
          </Link>
        </div>
      </section>
    </div>
  )
}
