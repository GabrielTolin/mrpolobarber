import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Gera os ícones do PWA a partir de public/icon-source.png (npm run icons),
// que é o logótipo do cliente recortado num quadrado preto.
// O quadrado já tem margem (logo a 80% da largura), por isso os ícones "maskable" e Apple
// não levam margem extra.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { sizes: [512], padding: 0, resizeOptions: { background: '#000000' } },
    apple: { sizes: [180], padding: 0, resizeOptions: { background: '#000000' } },
  },
  images: ['public/icon-source.png'],
})
