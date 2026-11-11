import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './auth'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  // Resultado da última verificação de administrador, guardado com o utilizador
  // a que se refere: se o utilizador mudar, a verificação fica "por fazer".
  const [adminCheck, setAdminCheck] = useState({ userId: null, isAdmin: false })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })

    // Sem chamadas ao Supabase dentro deste callback (pode bloquear o cliente):
    // só guarda a sessão; a verificação de administrador corre no efeito abaixo.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id ?? null

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (cancelled) return
      if (error) console.error('[MR Polo Barber] is_admin falhou:', error.message)
      setAdminCheck({ userId, isAdmin: data === true })
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  const adminPending = userId !== null && adminCheck.userId !== userId

  const value = {
    session,
    user: session?.user ?? null,
    isAdmin: userId !== null && adminCheck.userId === userId && adminCheck.isAdmin,
    // Enquanto a sessão ou a verificação de admin não terminam, as rotas esperam.
    loading: sessionLoading || adminPending,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
