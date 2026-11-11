import { Link, Outlet } from 'react-router-dom'

// Nome fixo por agora; passa a vir de public_info() na implementação (3.7).
const NOME_BARBEARIA = 'MR Polo Barber'

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-xl items-center px-4 py-4">
          <Link to="/" className="text-lg font-semibold text-ink">
            {NOME_BARBEARIA}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-xl px-4 py-4 text-sm text-ink-muted">
          {/* Link da política de privacidade: pendente P-04 */}
          <span>Política de privacidade (em breve)</span>
        </div>
      </footer>
    </div>
  )
}
