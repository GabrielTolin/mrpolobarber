import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Logo from '../components/Logo'
import { ICON_PROPS, NAV_ITENS } from './navegacao'
import { ligarAtualizacoes, marcarComoLidas, useNaoLidas } from './naoLidas'

const principais = NAV_ITENS.filter((i) => i.principal)
const secundarios = NAV_ITENS.filter((i) => !i.principal)

// Item da navegação (handoff: padding 11px 14px, raio 8px, texto 14px).
// Número de não lidas ao lado de "Notificações" (2.9: igual em todo o lado)
function Contador({ valor, pequeno = false }) {
  if (!valor) return null
  const texto = valor > 99 ? '99+' : valor
  return pequeno ? (
    <span className="absolute -top-1.5 left-1/2 ml-1.5 min-w-[18px] rounded-full bg-gold px-1 text-center text-[10px] leading-[18px] font-bold text-on-gold">
      {texto}
    </span>
  ) : (
    <span className="ml-auto min-w-[22px] rounded-full bg-gold px-1.5 text-center text-[11px] leading-[20px] font-bold text-on-gold">{texto}</span>
  )
}

function navClasses({ isActive }) {
  return `flex items-center gap-3 rounded-lg px-3.5 py-[11px] text-sm transition-colors ${
    isActive ? 'bg-gold-2/12 font-semibold text-gold' : 'text-muted hover:bg-hover hover:text-fg'
  }`
}

export default function AdminLayout() {
  const { signOut } = useAuth()
  const [maisAberto, setMaisAberto] = useState(false)
  const fecharMais = () => setMaisAberto(false)
  const naoLidas = useNaoLidas()

  useEffect(() => ligarAtualizacoes(), [])

  // Aberto ao tocar num push (?n=<id>): marca essa notificação como lida e limpa o endereço.
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const n = params.get('n')
    if (!n) return
    marcarComoLidas([n])
    params.delete('n')
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params}` : '' }, { replace: true })
  }, [location.search, location.pathname, navigate])

  return (
    <div className="min-h-screen bg-bg lg:flex">
      {/* Menu lateral (ecrãs ≥ 1024 px) */}
      <aside className="sticky top-0 hidden h-screen w-62 shrink-0 flex-col border-r border-line-sidebar bg-sidebar px-4 py-5 lg:flex">
        <Logo className="mx-auto mb-5 w-[180px]" />
        <nav className="flex flex-col gap-1">
          {NAV_ITENS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navClasses}>
              <Icon {...ICON_PROPS} />
              {label}
              {to === '/admin/notificacoes' && <Contador valor={naoLidas} />}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={signOut}
          className="mt-auto flex items-center gap-3 rounded-lg px-3.5 py-[11px] text-sm text-muted-2 transition-colors hover:bg-hover hover:text-fg"
        >
          <LogOut {...ICON_PROPS} />
          Terminar sessão
        </button>
      </aside>

      {/* Telemóvel e tablet: sem menu lateral, o logótipo fica como fundo discreto */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center lg:hidden">
        <img src="/brand-logo.webp" alt="" className="w-[78vw] max-w-[380px] opacity-[0.08]" />
      </div>

      {/* Conteúdo (com espaço para a barra inferior no telemóvel) */}
      <main className="relative z-10 min-w-0 flex-1 px-4 pt-6 pb-24 sm:px-8 lg:px-12 lg:py-10">
        <Outlet />
      </main>

      {/* Menu "Mais" (telemóvel e tablet) */}
      {maisAberto && (
        <div className="fixed inset-0 z-20 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/60"
            onClick={fecharMais}
          />
          <div className="absolute inset-x-0 bottom-16 rounded-t-2xl border-t border-line bg-sidebar p-4">
            <nav className="flex flex-col gap-1">
              {secundarios.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={fecharMais} className={navClasses}>
                  <Icon {...ICON_PROPS} />
                  {label}
                </NavLink>
              ))}
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-3 rounded-lg px-3.5 py-[11px] text-sm text-muted-2 hover:bg-hover hover:text-fg"
              >
                <LogOut {...ICON_PROPS} />
                Terminar sessão
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Barra inferior (telemóvel e tablet) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t border-line-sidebar bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden">
        {principais.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={fecharMais}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-1 text-[11px] ${
                isActive ? 'font-semibold text-gold' : 'text-muted'
              }`
            }
          >
            <span className="relative">
              <Icon {...ICON_PROPS} />
              {to === '/admin/notificacoes' && <Contador valor={naoLidas} pequeno />}
            </span>
            {label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMaisAberto((v) => !v)}
          className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] ${
            maisAberto ? 'font-semibold text-gold' : 'text-muted'
          }`}
        >
          {maisAberto ? <X {...ICON_PROPS} /> : <Menu {...ICON_PROPS} />}
          Mais
        </button>
      </nav>
    </div>
  )
}
