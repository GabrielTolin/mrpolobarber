import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Service worker escrito por nós (src/sw.js), porque trata o push (Arquitetura 3.10).
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      includeAssets: ['favicon.ico', 'logo.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: '/admin',
        name: 'MR Polo Barber — Painel',
        short_name: 'MR Polo',
        description: 'Agenda e marcações do MR Polo Barber.',
        lang: 'pt-PT',
        // O PWA é para o barbeiro: abre sempre no painel (Arquitetura 3.1, decisão 8).
        start_url: '/admin',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#111111',
        background_color: '#f6f6f6',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5174, // 5173 fica para o TS Hours, para poderem correr em paralelo
    host: true, // expõe na rede local (aceder pelo telemóvel: http://<IP-do-PC>:5174)
  },
  preview: {
    port: 4174,
    // permite hosts de túnel HTTPS (ex.: *.trycloudflare.com) para testar no telemóvel
    allowedHosts: true,
  },
})
