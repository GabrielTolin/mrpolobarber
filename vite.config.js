import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
