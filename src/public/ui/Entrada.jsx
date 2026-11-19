import { Link } from 'react-router-dom'
import { CalendarCheck, Clock, MapPin, MessageCircle, Scissors } from 'lucide-react'

const ICONE = { size: 16, strokeWidth: 1.8, 'aria-hidden': true }
const BRILHO = { textShadow: '0 0 36px rgba(227, 185, 85, 0.45)' }
const BOTAO_ATALHO = 'btn-ghost flex items-center justify-center gap-2 bg-black/50 py-3 text-[14px] backdrop-blur'

// Ícone do Instagram desenhado à mão (o lucide já não traz ícones de marcas).
function IconeInstagram({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Página de entrada (landing) — direção da referência 2 do Gabriel: ecrã inteiro
// com foto de fundo, título grande a dourado com brilho, botão de marcar no topo
// e destaques em baixo. Curta e direta: sem cabeçalho/risca do layout e sem as
// caixinhas do passo a passo (essas só aparecem depois de "Marcar horário").
// Primeiro telemóvel, depois ecrã grande (≥ 1024 px). Sem preços (2.7).
export default function Entrada({ nome, barbeiro, morada, mapa, whatsapp, instagram, horario, resumoHorario, foto, onMarcar }) {
  return (
    <div className="min-h-svh bg-bg text-fg">
      {/* ── Herói: ocupa o ecrã todo ── */}
      <section className="relative isolate flex min-h-svh flex-col overflow-hidden">
        {/* Fundo: foto do barbeiro (quando houver) ou luz quente + logótipo.
            Com foto: no telemóvel ocupa o ecrã todo; no ecrã grande fica num quadro à
            direita (a foto tem 896×1200 px — esticada a toda a largura ficaria desfocada). */}
        {foto ? (
          <>
            <img src={foto} alt="" aria-hidden className="absolute inset-0 -z-20 h-full w-full object-cover object-[45%_15%] lg:hidden" />
            {/* A foto é clara no topo (parede branca): escurece para o logótipo e os botões se verem */}
            <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-black/85 via-black/40 to-transparent lg:hidden" />
            <div aria-hidden className="absolute inset-0 -z-20 hidden bg-[radial-gradient(ellipse_at_75%_45%,#3a2f17_0%,#15120c_45%,#0a0907_80%)] lg:block" />
            <figure className="absolute top-1/2 right-[max(2.5rem,calc((100vw-1200px)/2+2.5rem))] hidden aspect-[4/5] w-[34vw] max-w-[440px] -translate-y-1/2 overflow-hidden rounded-2xl border border-line-gold/60 shadow-[0_0_80px_rgba(227,185,85,0.18)] lg:block">
              <img src={foto} alt={`${barbeiro} a trabalhar`} className="h-full w-full object-cover object-[45%_30%]" />
            </figure>
          </>
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
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/75 to-black/20 lg:bg-gradient-to-r lg:from-black/95 lg:via-black/60 lg:to-transparent" />

        {/* Barra do topo: logótipo + Marcar */}
        <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 pt-4 lg:px-10 lg:pt-6">
          <img src="/brand-logo.webp" alt={nome} className="h-14 w-auto mix-blend-lighten lg:h-16" />
          <div className="flex items-center gap-2">
            {instagram && (
              <a
                href={instagram.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Instagram ${instagram.handle}`}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-black/40 text-fg/90 backdrop-blur hover:text-gold"
              >
                <IconeInstagram size={18} />
              </a>
            )}
            <button
            type="button"
            onClick={onMarcar}
            className="btn-primary px-4 py-2.5 text-[13px] shadow-[0_0_24px_rgba(227,185,85,0.35)] lg:px-6 lg:text-sm"
          >
            Marcar
            </button>
          </div>
        </header>

        {/* Texto principal: em baixo no telemóvel, ao centro à esquerda no ecrã grande */}
        <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-end px-5 pb-8 lg:justify-center lg:px-10 lg:pb-20">
          <div className={foto ? 'lg:max-w-[560px] xl:max-w-[640px]' : 'lg:max-w-[780px]'}>
            <span className="inline-flex items-center gap-2 rounded-full border border-line-gold bg-black/50 px-3 py-1.5 text-xs text-fg/90 backdrop-blur">
              <Scissors size={13} strokeWidth={1.8} className="text-gold" aria-hidden /> Barbearia em Albufeira
            </span>

            <h1 style={BRILHO} className={`mt-4 text-[44px] leading-[0.98] font-extrabold tracking-tight text-gold ${foto ? 'lg:text-[72px] xl:text-[84px]' : 'lg:text-[92px]'}`}>
              Mr. Polo
              <br />
              Barber Shop
            </h1>

            <p className="mt-4 max-w-[440px] text-balance text-[15px] leading-relaxed text-fg/75 lg:max-w-[520px] lg:text-[17px]">
              Marque online em 1 minuto e fica confirmado na hora.
            </p>

            <div className="mt-6 flex flex-col gap-2.5 lg:max-w-[480px]">
              <button type="button" onClick={onMarcar} className="btn-primary py-4 text-[15px] shadow-[0_0_32px_rgba(227,185,85,0.35)]">
                Marcar horário
              </button>
              {/* Atalhos diretos: abrem o Google Maps, o Instagram e o WhatsApp */}
              {(mapa || instagram || whatsapp) && (
                <div
                  className={`grid gap-2.5 ${
                    [mapa, instagram, whatsapp].filter(Boolean).length === 3
                      ? 'grid-cols-3'
                      : [mapa, instagram, whatsapp].filter(Boolean).length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-1'
                  }`}
                >
                  {mapa && (
                    <a href={mapa} target="_blank" rel="noreferrer" className={BOTAO_ATALHO}>
                      <MapPin {...ICONE} className="shrink-0 text-gold" /> Mapa
                    </a>
                  )}
                  {instagram && (
                    <a href={instagram.url} target="_blank" rel="noreferrer" className={BOTAO_ATALHO}>
                      <IconeInstagram size={16} className="shrink-0 text-gold" /> Instagram
                    </a>
                  )}
                  {whatsapp && (
                    <a href={whatsapp} target="_blank" rel="noreferrer" className={BOTAO_ATALHO}>
                      <MessageCircle {...ICONE} className="shrink-0 text-gold" /> WhatsApp
                    </a>
                  )}
                </div>
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
            <div className="mt-5 grid grid-cols-2 gap-2.5 lg:flex lg:flex-wrap">
              {mapa && (
                <a href={mapa} target="_blank" rel="noreferrer" className="btn-ghost flex items-center justify-center gap-2 lg:px-6">
                  <MapPin {...ICONE} /> Ver no mapa
                </a>
              )}
              {instagram && (
                <a href={instagram.url} target="_blank" rel="noreferrer" className="btn-ghost flex items-center justify-center gap-2 lg:px-6">
                  <IconeInstagram size={16} /> {instagram.handle}
                </a>
              )}
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-ghost flex items-center justify-center gap-2 lg:px-6">
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
