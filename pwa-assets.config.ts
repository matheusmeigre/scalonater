// Gera os ícones do PWA a partir de public/favicon.svg: `npm run icons`.
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0B0A1C' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0B0A1C' } },
  },
  images: ['public/favicon.svg'],
})
