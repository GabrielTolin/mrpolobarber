// Edge Function send-push (Etapa 7.2; Arquitetura 3.8 §3, 3.10 §1).
//
// Chamada SÓ pela base de dados (trigger em notifications → pg_net), com o
// segredo partilhado no cabeçalho x-push-secret. Para a notificação indicada:
//   1. conta as não lidas (para o badge do ícone);
//   2. envia o push a todos os aparelhos ativados (push_subscriptions);
//   3. apaga os aparelhos expirados (404/410) e grava push_sent_at.
// Se o push falhar, a notificação continua no painel (fonte de verdade).
//
// Lembretes aos CLIENTES (2026-11-23): corpo { client_message_id } → envia a
// mensagem de client_push_messages aos aparelhos desse cliente
// (client_push_subscriptions), apaga os expirados e grava sent_at.
//
// Segredos (supabase secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT,
// PUSH_SHARED_SECRET. SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY vêm da Supabase.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { enviarPush } from './webpush.ts'

const env = (nome: string) => {
  const v = Deno.env.get(nome)
  if (!v) throw new Error(`Falta o segredo ${nome}`)
  return v
}

// Comparação em tempo constante (não dá pistas sobre o segredo)
function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

const json = (dados: unknown, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  if (!iguais(req.headers.get('x-push-secret') ?? '', env('PUSH_SHARED_SECRET'))) return json({ error: 'unauthorized' }, 401)

  let notificationId: string | undefined
  let clientMessageId: string | undefined
  try {
    const corpo = await req.json()
    notificationId = corpo?.notification_id
    clientMessageId = corpo?.client_message_id
  } catch {
    /* corpo inválido */
  }
  if (!notificationId && !clientMessageId) return json({ error: 'notification_id' }, 400)

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
  if (clientMessageId) return enviarAoCliente(db, clientMessageId)

  const { data: n, error: erroN } = await db
    .from('notifications')
    .select('id, type, title, body, appointment_id, appointments(start_at)')
    .eq('id', notificationId)
    .maybeSingle()
  if (erroN) return json({ error: erroN.message }, 500)
  if (!n) return json({ error: 'not_found' }, 404)

  const [{ count: naoLidas }, { data: aparelhos, error: erroA }] = await Promise.all([
    db.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
    db.from('push_subscriptions').select('id, endpoint, p256dh, auth'),
  ])
  if (erroA) return json({ error: erroA.message }, 500)

  // Para onde abre ao tocar (2.9): a marcação na agenda; o resumo abre a agenda de hoje.
  let url = '/admin/notificacoes'
  const inicio = (n.appointments as { start_at?: string } | null)?.start_at
  if (n.appointment_id && inicio) {
    const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date(inicio))
    url = `/admin/agenda?data=${dia}&m=${n.appointment_id}`
  } else if (n.type === 'daily_summary') {
    url = '/admin/agenda'
  }

  const vapid = { publica: env('VAPID_PUBLIC_KEY'), privada: env('VAPID_PRIVATE_KEY'), contacto: env('VAPID_SUBJECT') }
  const conteudo = { title: n.title, body: n.body, url, unread: naoLidas ?? 0, tag: n.id }

  let enviados = 0
  const expirados: string[] = []
  const falhas: number[] = []
  for (const a of aparelhos ?? []) {
    try {
      const status = await enviarPush(a, conteudo, vapid)
      if (status >= 200 && status < 300) enviados++
      else if (status === 404 || status === 410) expirados.push(a.id)
      else falhas.push(status)
    } catch (e) {
      console.error('push falhou', a.id, e)
      falhas.push(0)
    }
  }

  const agora = new Date().toISOString()
  if (expirados.length) await db.from('push_subscriptions').delete().in('id', expirados)
  if (enviados) {
    await db.from('notifications').update({ push_sent_at: agora }).eq('id', n.id)
    await db
      .from('push_subscriptions')
      .update({ last_used_at: agora })
      .in('id', (aparelhos ?? []).filter((a) => !expirados.includes(a.id)).map((a) => a.id))
  }

  return json({ ok: true, aparelhos: aparelhos?.length ?? 0, enviados, expirados: expirados.length, falhas })
})

// Lembrete a um cliente: todos os aparelhos que ele ativou.
// deno-lint-ignore no-explicit-any
async function enviarAoCliente(db: any, id: string) {
  const { data: m, error } = await db
    .from('client_push_messages')
    .select('id, client_id, title, body, url, sent_at')
    .eq('id', id)
    .maybeSingle()
  if (error) return json({ error: error.message }, 500)
  if (!m) return json({ error: 'not_found' }, 404)
  if (m.sent_at) return json({ ok: true, repetido: true })

  const { data: aparelhos, error: erroA } = await db
    .from('client_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('client_id', m.client_id)
  if (erroA) return json({ error: erroA.message }, 500)

  const vapid = { publica: env('VAPID_PUBLIC_KEY'), privada: env('VAPID_PRIVATE_KEY'), contacto: env('VAPID_SUBJECT') }
  const conteudo = { title: m.title, body: m.body, url: m.url || '/', tag: m.id }

  let enviados = 0
  const expirados: string[] = []
  const falhas: number[] = []
  for (const a of aparelhos ?? []) {
    try {
      const status = await enviarPush(a, conteudo, vapid)
      if (status >= 200 && status < 300) enviados++
      else if (status === 404 || status === 410) expirados.push(a.id)
      else falhas.push(status)
    } catch (e) {
      console.error('lembrete falhou', a.id, e)
      falhas.push(0)
    }
  }

  const agora = new Date().toISOString()
  if (expirados.length) await db.from('client_push_subscriptions').delete().in('id', expirados)
  if (enviados) {
    await db.from('client_push_messages').update({ sent_at: agora }).eq('id', m.id)
    await db
      .from('client_push_subscriptions')
      .update({ last_used_at: agora })
      .in('id', (aparelhos ?? []).filter((a: { id: string }) => !expirados.includes(a.id)).map((a: { id: string }) => a.id))
  }
  return json({ ok: true, aparelhos: aparelhos?.length ?? 0, enviados, expirados: expirados.length, falhas })
}
