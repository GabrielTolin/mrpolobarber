import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Notificações push NESTE dispositivo (7.3; Especificação 2.9 parte 2; Arquitetura 3.10).
// Ativar = pedir permissão (tem de ser um toque, exigência do iPhone) → criar a
// subscrição no service worker → gravá-la em push_subscriptions (só as do próprio).

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY

function chaveParaBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64url.length % 4)) % 4)
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

export function ambiente() {
  const ua = navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const instalado = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
  const suportado = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && Boolean(VAPID)
  return { ios, instalado, suportado, permissao: 'Notification' in window ? Notification.permission : 'unsupported' }
}

// O service worker só existe na versão de produção (no `npm run dev` não há).
async function registoSW(esperaMs = 8000) {
  if (!('serviceWorker' in navigator)) return null
  return Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), esperaMs))])
}

async function gravar(sub, userId) {
  const j = sub.toJSON()
  // Sem política de "update": apaga a deste endereço (se for nossa) e volta a inserir.
  await supabase.from('push_subscriptions').delete().eq('endpoint', j.endpoint)
  const { error } = await supabase.from('push_subscriptions').insert({
    user_id: userId,
    endpoint: j.endpoint,
    p256dh: j.keys.p256dh,
    auth: j.keys.auth,
    user_agent: navigator.userAgent.slice(0, 300),
  })
  if (error) throw Object.assign(new Error(error.message), { codigo: 'GRAVAR' })
}

// Estados: sem-suporte · instalar (iPhone fora do ecrã principal) · bloqueadas · desativadas · ativas
async function lerEstado() {
  const amb = ambiente()
  if (amb.ios && !amb.instalado) return { estado: 'instalar', amb }
  if (!amb.suportado) return { estado: 'sem-suporte', amb }
  if (amb.permissao === 'denied') return { estado: 'bloqueadas', amb }
  const reg = await registoSW(1500)
  const sub = await reg?.pushManager.getSubscription()
  return { estado: sub && amb.permissao === 'granted' ? 'ativas' : 'desativadas', amb, sub }
}

export function usePush(userId) {
  const [info, setInfo] = useState({ estado: 'a-ver' })
  const [aparelhos, setAparelhos] = useState(null)

  const atualizar = useCallback(async () => {
    const novo = await lerEstado()
    // Se o aparelho está subscrito mas a linha desapareceu (ex.: limpa por expirar), volta a gravar.
    if (novo.estado === 'ativas' && userId) {
      const { data } = await supabase.from('push_subscriptions').select('id').eq('endpoint', novo.sub.endpoint).maybeSingle()
      if (!data) await gravar(novo.sub, userId).catch(() => {})
    }
    const { count } = await supabase.from('push_subscriptions').select('id', { count: 'exact', head: true })
    setAparelhos(count ?? 0)
    setInfo(novo)
  }, [userId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    atualizar()
  }, [atualizar])

  async function ativar() {
    const permissao = await Notification.requestPermission()
    if (permissao !== 'granted') {
      await atualizar()
      throw Object.assign(new Error('permissão'), { codigo: permissao === 'denied' ? 'NEGADA' : 'IGNORADA' })
    }
    const reg = await registoSW()
    if (!reg) throw Object.assign(new Error('sem service worker'), { codigo: 'SEM_SW' })
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(VAPID) }))
    await gravar(sub, userId)
    await atualizar()
  }

  async function desativar() {
    const reg = await registoSW(1500)
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
    await atualizar()
  }

  async function enviarTeste() {
    const { error } = await supabase.rpc('admin_send_test_notification')
    if (error) throw Object.assign(new Error(error.message), { codigo: 'TESTE' })
  }

  return { ...info, aparelhos, ativar, desativar, enviarTeste, atualizar }
}

export const MENSAGENS_PUSH = {
  NEGADA: 'As notificações foram bloqueadas. Pode ativá-las nas definições do telemóvel.',
  IGNORADA: 'É preciso tocar em "Permitir" para receber notificações.',
  SEM_SW: 'A app ainda não está pronta neste aparelho. Feche-a, abra-a de novo e tente outra vez.',
  GRAVAR: 'Não foi possível guardar este aparelho. Tente de novo.',
  TESTE: 'Não foi possível enviar a notificação de teste.',
}
