import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

// Lê e grava a linha única de settings (2.13). Escrita direta permitida ao admin (RLS 5.1).
export function useSettings() {
  const [settings, setSettings] = useState(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single()
    if (error) setErro('Não foi possível carregar as configurações.')
    else setSettings(data)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar()
  }, [carregar])

  // Grava só os campos indicados e devolve { error }.
  async function gravar(campos) {
    const { data, error } = await supabase.from('settings').update(campos).eq('id', 1).select().single()
    if (!error) setSettings(data)
    return { error }
  }

  return { settings, erro, gravar }
}
