import { ShieldX } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Logo from '../components/Logo'

export default function SemAcesso() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sidebar px-4 py-10">
      <Logo className="mb-8 w-[160px]" />
      <section className="card w-full max-w-sm bg-bg text-center">
        <ShieldX className="mx-auto mb-3 text-warn" size={32} strokeWidth={1.8} aria-hidden />
        <h1 className="font-serif text-[34px] leading-tight font-semibold">Sem acesso</h1>
        <p className="mt-2 text-sm text-muted">
          A conta {user?.email ? <strong className="text-fg">{user.email}</strong> : 'atual'} não tem
          permissão para usar o painel.
        </p>
        <button type="button" onClick={signOut} className="btn-ghost mt-6 w-full">
          Terminar sessão
        </button>
      </section>
    </div>
  )
}
