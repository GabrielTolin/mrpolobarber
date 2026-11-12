import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Gera os ícones do PWA a partir de public/logo.svg (npm run icons).
// O logótipo já tem fundo próprio, por isso os ícones "maskable" e Apple
// não levam margem extra. Trocar o logo.svg quando houver identidade visual (P-12).
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { sizes: [512], padding: 0, resizeOptions: { background: '#111111' } },
    apple: { sizes: [180], padding: 0, resizeOptions: { background: '#111111' } },
  },
  images: ['public/logo.svg'],
})
