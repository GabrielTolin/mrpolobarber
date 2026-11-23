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
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
        // Fonte dos ícones (só serve para os gerar): não vai para a cache do PWA.
        // Tipos de letra cirílicos/gregos/vietnamitas: só se descarregam se forem precisos.
        globIgnores: ['**/icon-source.png', '**/*-cyrillic*', '**/*-greek*', '**/*-vietnamese*'],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      // Dois manifestos em public/ (2026-11-23): manifest-publico (index.html, abre em /) e
      // manifest-painel (admin.html, abre em /admin). Antes havia um só, com start_url /admin,
      // e um cliente que instalasse a página pública ficava com o painel no ecrã principal.
      manifest: false,
    }),
  ],
  build: {
    rollupOptions: {
      input: { main: 'index.html', admin: 'admin.html' },
    },
  },
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
