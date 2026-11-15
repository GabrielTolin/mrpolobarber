import { createClient } from '@supabase/supabase-js'

// Cliente Supabase SÓ da área pública (6.7): sem sessão, sem armazenamento.
// O cliente normal (supabase.js, usado pelo painel) lê a sessão do localStorage
// antes de cada pedido — com o armazenamento do navegador bloqueado isso falha
// e a marcação não funcionava (Arquitetura 3.9: tem de dar para marcar na mesma).
// O público só chama funções públicas (anon), por isso não precisa de sessão.
export const supabasePublico = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'mpb-publico',
  },
})
