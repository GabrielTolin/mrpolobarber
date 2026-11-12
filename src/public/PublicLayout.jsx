import { Link, Outlet } from 'react-router-dom'
import Logo from '../components/Logo'

// Visual provisório da área pública com a identidade do painel.
// O desenho próprio da página de marcação vem na etapa da área pública.
export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-line-sidebar bg-sidebar">
        <div className="mx-auto flex max-w-xl justify-center px-4 py-4">
          <Link to="/" aria-label="Início">
            <Logo className="w-[120px]" />
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-10">
        <Outlet />
      </main>

      <footer className="border-t border-line-sidebar">
        <div className="mx-auto max-w-xl px-4 py-4 text-sm text-muted-2">
          {/* Link da política de privacidade: pendente P-04 */}
          <span>Política de privacidade (em breve)</span>
        </div>
      </footer>
    </div>
  )
}
