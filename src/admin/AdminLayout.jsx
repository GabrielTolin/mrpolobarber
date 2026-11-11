import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { NAV_ITENS } from './navegacao'

const principais = NAV_ITENS.filter((i) => i.principal)
const secundarios = NAV_ITENS.filter((i) => !i.principal)

function linkClasses({ isActive }) {
  return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
    isActive ? 'bg-ink text-white' : 'text-ink hover:bg-canvas'
  }`
}

export default function AdminLayout() {
  const { signOut } = useAuth()
  const [maisAberto, setMaisAberto] = useState(false)
  const fecharMais = () => setMaisAberto(false)

  return (
    <div className="min-h-screen md:flex">
      {/* Menu lateral (ecrãs ≥ 768 px) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface p-4 md:flex">
        <div className="mb-6 px-3 text-lg font-semibold">MR Polo Barber</div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITENS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClasses}>
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-canvas"
        >
          <LogOut className="h-5 w-5" aria-hidden />
          Terminar sessão
        </button>
      </aside>

      {/* Conteúdo (com espaço para a barra inferior no telemóvel) */}
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Menu "Mais" (telemóvel) */}
      {maisAberto && (
        <div className="fixed inset-0 z-20 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/30"
            onClick={fecharMais}
          />
          <div className="absolute inset-x-0 bottom-16 rounded-t-2xl border-t border-line bg-surface p-4">
            <nav className="flex flex-col gap-1">
              {secundarios.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} onClick={fecharMais} className={linkClasses}>
                  <Icon className="h-5 w-5" aria-hidden />
                  {label}
                </NavLink>
              ))}
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-canvas"
              >
                <LogOut className="h-5 w-5" aria-hidden />
                Terminar sessão
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Barra inferior (telemóvel) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t border-line bg-surface md:hidden">
        {principais.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={fecharMais}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-1 text-xs ${
                isActive ? 'text-ink' : 'text-ink-muted'
              }`
            }
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMaisAberto((v) => !v)}
          className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs ${
            maisAberto ? 'text-ink' : 'text-ink-muted'
          }`}
        >
          {maisAberto ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          Mais
        </button>
      </nav>
    </div>
  )
}
