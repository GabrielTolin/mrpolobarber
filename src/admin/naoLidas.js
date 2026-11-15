import { useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabase'
import { partesLisboa } from '../lib/datas'

// Notificações não lidas = pendências (Especificação 2.9 parte 2).
// UM só contador para o painel inteiro: navegação, Início, página Notificações e
// o número no ícone da app (badge) mostram sempre o mesmo valor.

let total = null
const ouvintes = new Set()
const emitir = () => ouvintes.forEach((f) => f())

export async function atualizarNaoLidas() {
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null)
  if (error) return
  total = count ?? 0
  try {
    if ('setAppBadge' in navigator) {
      if (total > 0) await navigator.setAppBadge(total)
      else await navigator.clearAppBadge()
    }
  } catch {
    /* badge não suportado neste navegador */
  }
  emitir()
}

export function useNaoLidas() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => total,
  )
}

// Mantém o contador certo enquanto o painel está aberto: ao abrir, ao voltar à
// app, quando chega um push (aviso do service worker) e de minuto a minuto.
export function ligarAtualizacoes() {
  atualizarNaoLidas()
  const aoVoltar = () => document.visibilityState === 'visible' && atualizarNaoLidas()
  const aoMensagem = (e) => e.data?.tipo === 'notificacao' && atualizarNaoLidas()
  document.addEventListener('visibilitychange', aoVoltar)
  navigator.serviceWorker?.addEventListener('message', aoMensagem)
  const relogio = setInterval(atualizarNaoLidas, 60_000)
  return () => {
    document.removeEventListener('visibilitychange', aoVoltar)
    navigator.serviceWorker?.removeEventListener('message', aoMensagem)
    clearInterval(relogio)
  }
}

export async function marcarComoLidas(ids) {
  if (!ids?.length) return
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids).is('read_at', null)
  await atualizarNaoLidas()
}

export async function marcarTodasComoLidas() {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
  await atualizarNaoLidas()
}

// Para onde leva cada notificação (2.9): a marcação na agenda; o resumo do dia
// abre a agenda de hoje; o teste não leva a lado nenhum.
// `n.appointments` vem do select com `appointments(start_at)`.
export function destinoDe(n) {
  const inicio = n.appointments?.start_at
  if (n.appointment_id && inicio) return `/admin/agenda?data=${partesLisboa(inicio).data}&m=${n.appointment_id}`
  if (n.type === 'daily_summary') return '/admin/agenda'
  return null
}

export const SELECT_NOTIFICACAO = 'id, type, title, body, appointment_id, created_at, read_at, appointments(start_at)'
