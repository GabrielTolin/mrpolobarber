// Estados das marcações (Especificação 2.3) e cores do design.

// O painel mostra o estado "efetivo", calculado pela hora (Arquitetura 3.8):
// nunca aparece "Confirmada" numa marcação que já começou, mesmo que o cron
// ainda não tenha corrido.
export function estadoEfetivo(marcacao, agora = new Date()) {
  const { status } = marcacao
  if (status !== 'confirmed' && status !== 'in_progress') return status
  if (agora >= new Date(marcacao.end_at)) return 'completed'
  if (agora >= new Date(marcacao.start_at)) return 'in_progress'
  return 'confirmed'
}

export const ESTADOS = {
  confirmed: { label: 'Confirmada', cor: 'text-ok' },
  in_progress: { label: 'Em curso', cor: 'text-gold' },
  completed: { label: 'Concluída', cor: 'text-muted-2' },
  cancelled: { label: 'Cancelada', cor: 'text-muted-2' },
  no_show: { label: 'Falta', cor: 'text-warn' },
}

// Texto completo do estado, com o detalhe do cancelamento (2.3).
export function descreverEstado(marcacao, agora = new Date()) {
  const estado = estadoEfetivo(marcacao, agora)
  if (estado !== 'cancelled') return ESTADOS[estado].label
  if (marcacao.cancelled_late) return 'Cancelamento tardio'
  return marcacao.cancelled_by === 'client' ? 'Cancelada pelo cliente' : 'Cancelada pelo barbeiro'
}

export const ORIGENS = {
  online: 'Online',
  whatsapp: 'WhatsApp',
  phone: 'Telefone',
  walk_in: 'Presencial',
}
