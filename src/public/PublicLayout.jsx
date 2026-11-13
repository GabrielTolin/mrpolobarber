import { Link, Outlet, useLocation } from 'react-router-dom'
import Logo from '../components/Logo'

// Área pública (Etapa 6): mesma linha do painel — fundo escuro, logótipo como
// fundo discreto (8 %), cabeçalho com o logótipo e a risca do barber pole.
// Pensada primeiro para o telemóvel (coluna de 480 px no máximo).
// A página de entrada (/) é "imersiva": ocupa o ecrã todo, sem cabeçalho,
// risca nem rodapé (tem os seus próprios). O fluxo de marcação usa o layout normal.
export default function PublicLayout() {
  const { pathname, search } = useLocation()
  const ecraDesign = new URLSearchParams(search).get('ecra') ?? '0'
  const imersivo = pathname === '/' || (import.meta.env.DEV && pathname === '/design' && ecraDesign === '0')

  if (imersivo) return <Outlet />

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-bg">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center">
        <img src="/brand-logo.webp" alt="" className="w-[78vw] max-w-[420px] opacity-[0.08]" />
      </div>

      <header className="relative z-10 bg-sidebar">
        <div className="mx-auto flex max-w-[480px] justify-center px-4 pt-4 pb-3">
          <Link to="/" aria-label="Início">
            <Logo className="w-[104px]" />
          </Link>
        </div>
        <div className="pole rounded-none" />
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[480px] flex-1 px-4 pt-6 pb-10">
        <Outlet />
      </main>

      <footer className="relative z-10 border-t border-line-sidebar bg-sidebar/80">
        <div className="mx-auto flex max-w-[480px] flex-col gap-1 px-4 py-4 text-xs text-muted-2">
          <Link to="/privacidade" className="w-fit hover:text-muted">
            Política de privacidade
          </Link>
        </div>
      </footer>
    </div>
  )
}
