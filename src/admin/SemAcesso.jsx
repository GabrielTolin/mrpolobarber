import { ShieldX } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function SemAcesso() {
  const { user, signOut } = useAuth()

  return (
    <section className="mx-auto max-w-sm px-4 py-16 text-center">
      <ShieldX className="mx-auto mb-4 h-10 w-10 text-ink-muted" aria-hidden />
      <h1 className="text-2xl font-semibold text-ink">Sem acesso</h1>
      <p className="mt-2 text-ink-muted">
        A conta {user?.email ? <strong>{user.email}</strong> : 'atual'} não tem permissão para
        usar o painel.
      </p>
      <button
        type="button"
        onClick={signOut}
        className="mt-6 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white"
      >
        Terminar sessão
      </button>
    </section>
  )
}
