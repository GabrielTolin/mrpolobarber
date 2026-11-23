import { useCallback, useEffect, useState } from 'react'
import { BellRing, Check } from 'lucide-react'
import { supabasePublico as supabase } from '../../lib/supabasePublico'

// Lembrete ao cliente no dia da marcação, às 08:00 (2026-11-23).
// O código da marcação liga ESTE aparelho à ficha do cliente: recebe o lembrete de
// todas as marcações dele (também as feitas pelo barbeiro e as semanais).
// No iPhone só funciona com a página instalada no ecrã principal (regra da Apple).

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY
const CHAVE = 'mrpolo:lembretes'

function chaveParaBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64url.length % 4)) % 4)
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

function ambiente() {
  const ua = navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const instalado = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
  const suportado = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && Boolean(VAPID)
  return { ios, instalado, suportado }
}

const lembrado = () => {
  try {
    return localStorage.getItem(CHAVE) === '1'
  } catch {
    return false
  }
}
const lembrar = (sim) => {
  try {
    if (sim) localStorage.setItem(CHAVE, '1')
    else localStorage.removeItem(CHAVE)
  } catch {
    /* sem armazenamento */
  }
}

async function registoSW(ms = 1500) {
  if (!('serviceWorker' in navigator)) return null
  return Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), ms))])
}

// Estados: oculto · instalar (iPhone fora do ecrã principal) · bloqueadas · desativadas · ativas
async function lerEstado() {
  const amb = ambiente()
  if (amb.ios && !amb.instalado) return 'instalar'
  if (!amb.suportado) return 'oculto'
  if (Notification.permission === 'denied') return 'bloqueadas'
  const sub = await (await registoSW())?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' && lembrado() ? 'ativas' : 'desativadas'
}

export default function AtivarLembretes({ codigo }) {
  const [estado, setEstado] = useState('a-ver')
  const [aTrabalhar, setATrabalhar] = useState(false)
  const [erro, setErro] = useState('')

  const atualizar = useCallback(async () => setEstado(await lerEstado()), [])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    atualizar()
  }, [atualizar])

  async function ativar() {
    setErro('')
    setATrabalhar(true)
    try {
      // O pedido de permissão tem de vir logo do toque (exigência do iPhone).
      const permissao = await Notification.requestPermission()
      if (permissao !== 'granted') {
        setEstado(permissao === 'denied' ? 'bloqueadas' : 'desativadas')
        return
      }
      const reg = await registoSW(8000)
      if (!reg) throw new Error('sem service worker')
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(VAPID) }))
      const j = sub.toJSON()
      const { data, error } = await supabase.rpc('subscribe_client_push', {
        p_code: codigo,
        p_endpoint: j.endpoint,
        p_p256dh: j.keys.p256dh,
        p_auth: j.keys.auth,
        p_user_agent: navigator.userAgent.slice(0, 300),
      })
      if (error || !data?.ok) throw new Error(error?.message ?? data?.error)
      lembrar(true)
      setEstado('ativas')
    } catch {
      setErro('Não foi possível ativar. Tente de novo daqui a pouco.')
    } finally {
      setATrabalhar(false)
    }
  }

  async function desativar() {
    setATrabalhar(true)
    try {
      const sub = await (await registoSW())?.pushManager.getSubscription()
      if (sub) await supabase.rpc('unsubscribe_client_push', { p_endpoint: sub.endpoint })
    } finally {
      lembrar(false)
      setATrabalhar(false)
      setEstado('desativadas')
    }
  }

  if (estado === 'a-ver' || estado === 'oculto') return null

  return (
    <div className="card mt-5 flex flex-col gap-2.5 bg-bg/70">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <BellRing size={16} strokeWidth={1.8} className="text-gold" aria-hidden /> Lembrete no dia da marcação
      </p>

      {estado === 'instalar' && (
        <p className="text-xs text-muted">
          No iPhone, para receber um lembrete às 08:00 do dia da marcação, adicione esta página ao ecrã principal (<b>Partilhar → Adicionar
          ao ecrã principal</b>), abra-a a partir do ícone e ative aqui.
        </p>
      )}

      {estado === 'bloqueadas' && (
        <p className="text-xs text-muted">As notificações estão bloqueadas neste telemóvel. Pode permiti-las nas definições do telemóvel.</p>
      )}

      {estado === 'desativadas' && (
        <>
          <p className="text-xs text-muted">Recebe uma notificação às 08:00 no dia de cada marcação. Sem SMS nem publicidade.</p>
          <button type="button" onClick={ativar} disabled={aTrabalhar} className="btn-gold flex items-center justify-center gap-2">
            <BellRing size={16} strokeWidth={1.8} aria-hidden /> {aTrabalhar ? 'A ativar…' : 'Ativar lembrete'}
          </button>
        </>
      )}

      {estado === 'ativas' && (
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-ok">
            <Check size={14} strokeWidth={2.2} aria-hidden /> Ativo neste telemóvel (08:00 no dia de cada marcação)
          </p>
          <button type="button" onClick={desativar} disabled={aTrabalhar} className="shrink-0 text-xs text-muted underline hover:text-fg">
            Desativar
          </button>
        </div>
      )}

      {erro && <p role="alert" className="text-xs text-warn">{erro}</p>}
    </div>
  )
}
