import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Logo from '../components/Logo'
import { ICON_PROPS, NAV_ITENS } from './navegacao'

const principais = NAV_ITENS.filter((i) => i.principal)
const secundarios = NAV_ITENS.filter((i) => !i.principal)

// Item da navegação (handoff: padding 11px 14px, raio 8px, texto 14px).
function navClasses({ isActive }) {
  return `flex items-center gap-3 rounded-lg px-3.5 py-[11px] text-sm transition-colors ${
    isActive ? 'bg-gold-2/12 font-semibold text-gold' : 'text-muted hover:bg-hover hover:text-fg'
  }`
}

export default function AdminLayout() {
  const { signOut } = useAuth()
  const [maisAberto, setMaisAberto] = useState(false)
  const fecharMais = () => setMaisAberto(false)

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

      {/* Conteúdo (com espaço para a barra inferior no telemóvel) */}
      <main className="min-w-0 flex-1 px-4 pt-6 pb-24 sm:px-8 lg:px-12 lg:py-10">
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
            <Icon {...ICON_PROPS} />
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
