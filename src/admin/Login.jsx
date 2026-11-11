import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Carregando from '../components/Carregando'

export default function Login() {
  const { session, loading, signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [aEntrar, setAEntrar] = useState(false)

  if (loading) return <Carregando />
  // Já autenticado: o RotaAdmin decide entre o painel e o "Sem acesso".
  if (session) return <Navigate to={location.state?.from ?? '/admin'} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setAEntrar(true)
    const { error } = await signIn(email.trim(), password)
    setAEntrar(false)
    if (error) {
      setErro(
        error.message === 'Invalid login credentials'
          ? 'Email ou palavra-passe incorretos.'
          : 'Não foi possível entrar. Tente novamente.'
      )
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-surface p-6"
      >
        <div>
          <h1 className="text-xl font-semibold text-ink">Painel do barbeiro</h1>
          <p className="text-sm text-ink-muted">MR Polo Barber</p>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-ink">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-ink"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">Palavra-passe</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-ink"
          />
        </label>

        {erro && (
          <p className="text-sm text-red-600" role="alert">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={aEntrar}
          className="w-full rounded-lg bg-ink px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {aEntrar ? 'A entrar…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
