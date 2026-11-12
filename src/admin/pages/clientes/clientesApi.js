import { supabase } from '../../../lib/supabase'

// Contagens do histórico de um cliente (faltas e cancelamentos tardios são
// calculados a partir das marcações, Arquitetura 3.2).
export function resumoCliente(marcacoes = []) {
  const realizadas = marcacoes.filter((m) => m.status === 'completed').length
  const faltas = marcacoes.filter((m) => m.status === 'no_show').length
  const tardios = marcacoes.filter((m) => m.status === 'cancelled' && m.cancelled_late).length
  const ultima = marcacoes
    .filter((m) => m.status === 'completed')
    .map((m) => m.start_at)
    .sort()
    .at(-1)
  return { realizadas, faltas, tardios, ultima }
}

// Mensagem para o erro de telemóvel repetido (2.10: "Este número já pertence a …").
export async function donoDoTelefone(e164, excetoId) {
  let q = supabase.from('clients').select('id, name').eq('phone_e164', e164)
  if (excetoId) q = q.neq('id', excetoId)
  const { data } = await q.maybeSingle()
  return data
}
