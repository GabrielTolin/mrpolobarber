import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { hojeLisboa, instanteLisboa, somarDias } from '../../../lib/datas'

// Dados do Início (Especificação 2.8): marcações de hoje, histórico dos clientes
// de hoje (visitas, faltas), notificações não lidas (pendências, 2.9) e settings.
export function useDashboard() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    const pedido = { ativo: true } // ignora respostas de pedidos antigos
    const hoje = hojeLisboa()
    const ini = instanteLisboa(hoje).toISOString()
    const fim = instanteLisboa(somarDias(hoje, 1)).toISOString()

    async function carregar() {
      const [ap, st, nt, nc] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, client_id, client_name, start_at, end_at, status, source, total_price_cents, total_duration_minutes, is_intentional_overlap, cancelled_by, cancelled_late, clients(phone_e164, is_regular), appointment_services(service_name)')
          .gte('start_at', ini)
          .lt('start_at', fim)
          .order('start_at'),
        supabase.from('settings').select('owner_name, business_name, late_tolerance_minutes, no_show_flag_threshold').eq('id', 1).single(),
        supabase.from('notifications').select('id, title, body, appointment_id, created_at').is('read_at', null).order('created_at', { ascending: false }).limit(3),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
      ])
      const falhou = [ap, st, nt, nc].find((r) => r.error)
      if (falhou) throw falhou.error

      // Histórico dos clientes de hoje (nº de visitas, faltas, última visita).
      const ids = [...new Set(ap.data.map((m) => m.client_id))]
      let historico = []
      if (ids.length) {
        const h = await supabase.from('appointments').select('client_id, status, start_at').in('client_id', ids)
        if (h.error) throw h.error
        historico = h.data
      }
      return { marcacoes: ap.data, settings: st.data, notificacoes: nt.data, naoLidas: nc.count ?? 0, historico }
    }

    carregar()
      .then((d) => {
        if (!pedido.ativo) return
        setDados(d)
        setErro('')
      })
      .catch(() => pedido.ativo && setErro('Não foi possível carregar o Início.'))
    return () => {
      pedido.ativo = false
    }
  }, [versao])

  // Atualiza a cada minuto (novas marcações, estados pela hora).
  useEffect(() => {
    const t = setInterval(() => setVersao((v) => v + 1), 60000)
    return () => clearInterval(t)
  }, [])

  return { dados, erro, recarregar: () => setVersao((v) => v + 1) }
}

// Visitas concluídas, faltas e última visita de um cliente.
export function resumoDoCliente(historico, clientId, antesDe) {
  const doCliente = historico.filter((h) => h.client_id === clientId)
  const concluidas = doCliente.filter((h) => h.status === 'completed' && new Date(h.start_at) < new Date(antesDe))
  return {
    visitas: concluidas.length,
    faltas: doCliente.filter((h) => h.status === 'no_show').length,
    ultima: concluidas.map((h) => h.start_at).sort().at(-1) ?? null,
  }
}
