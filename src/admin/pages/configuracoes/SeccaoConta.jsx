import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'

const MINIMO = 8

// Mensagens do Supabase Auth em português.
function traduzErro(error) {
  if (error?.code === 'same_password') return 'A nova palavra-passe tem de ser diferente da atual.'
  if (error?.code === 'weak_password') return `A palavra-passe é demasiado fraca (mínimo ${MINIMO} caracteres).`
  if (error?.status === 401 || error?.code === 'session_not_found')
    return 'A sessão expirou. Entre de novo e repita.'
  return 'Não foi possível mudar a palavra-passe. Tente novamente.'
}

// Conta (2.14 regra 5, 3.9): mudar a palavra-passe dentro do painel, sem email.
export default function SeccaoConta() {
  const { user } = useAuth()
  const [nova, setNova] = useState('')
  const [repetir, setRepetir] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [aGravar, setAGravar] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setSucesso(false)

    if (nova.length < MINIMO) return setErro(`A palavra-passe tem de ter pelo menos ${MINIMO} caracteres.`)
    if (nova !== repetir) return setErro('As duas palavras-passe não são iguais.')

    setAGravar(true)
    const { error } = await supabase.auth.updateUser({ password: nova })
    setAGravar(false)

    if (error) return setErro(traduzErro(error))
    setNova('')
    setRepetir('')
    setSucesso(true)
  }

  return (
    <section className="card">
      <h2 className="card-title">Conta</h2>
      <p className="mt-1 text-sm text-muted">
        Sessão iniciada como <span className="text-fg">{user?.email ?? '—'}</span>
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 border-t border-line-soft pt-5">
        <h3 className="text-[15px] font-semibold">Mudar palavra-passe</h3>

        <label className="block">
          <span className="text-sm font-medium text-muted">Nova palavra-passe</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={MINIMO}
            required
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            className="field mt-1.5"
          />
          <span className="mt-1 block text-xs text-muted-2">Mínimo {MINIMO} caracteres.</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-muted">Repetir a nova palavra-passe</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={MINIMO}
            required
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
            className="field mt-1.5"
          />
        </label>

        {erro && (
          <p className="text-sm text-warn" role="alert">
            {erro}
          </p>
        )}
        {sucesso && (
          <p className="text-sm text-ok" role="status">
            Palavra-passe alterada. Use a nova na próxima vez que entrar.
          </p>
        )}

        <button type="submit" disabled={aGravar} className="btn-primary">
          {aGravar ? 'A gravar…' : 'Mudar palavra-passe'}
        </button>
      </form>
    </section>
  )
}
