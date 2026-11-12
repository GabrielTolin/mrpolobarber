import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Carregando from '../components/Carregando'
import Logo from '../components/Logo'

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-sidebar px-4 py-10">
      <Logo className="mb-8 w-[200px]" />

      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-5 bg-bg">
        <div>
          <p className="eyebrow">Painel do barbeiro</p>
          <h1 className="mt-1 font-serif text-[34px] leading-tight font-semibold">Entrar</h1>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-muted">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field mt-1.5"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-muted">Palavra-passe</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field mt-1.5"
          />
        </label>

        {erro && (
          <p className="text-sm text-warn" role="alert">
            {erro}
          </p>
        )}

        <button type="submit" disabled={aEntrar} className="btn-primary w-full">
          {aEntrar ? 'A entrar…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
