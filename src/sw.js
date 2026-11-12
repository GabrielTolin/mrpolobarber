/* Service worker do MR Polo Barber (modo injectManifest, Arquitetura 3.10).
 * - Pré-carrega os ficheiros do site (funciona sem rede depois da 1.ª visita).
 * - Navegação da SPA: qualquer rota devolve o index.html.
 * - Push: mostra a notificação e atualiza o badge do ícone (2.9).
 * - Toque na notificação: abre o PWA no endereço indicado.
 */
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Pedidos ao Supabase são de outro domínio e não passam por aqui (vão sempre à rede).
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Conteúdo esperado do push (enviado pela Edge Function send-push, 3.8):
// { title, body, url, unread }
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data?.text() }
  }

  const title = data.title || 'MR Polo Barber'
  const options = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    data: { url: data.url || '/admin' },
  }

  const tarefas = [self.registration.showNotification(title, options)]
  if (typeof data.unread === 'number' && 'setAppBadge' in navigator) {
    tarefas.push(data.unread > 0 ? navigator.setAppBadge(data.unread) : navigator.clearAppBadge())
  }
  event.waitUntil(Promise.all(tarefas))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/admin', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      const aberta = janelas.find((j) => j.url.startsWith(self.location.origin))
      if (aberta) {
        aberta.navigate(url)
        return aberta.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
