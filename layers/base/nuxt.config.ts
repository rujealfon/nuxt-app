import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  icon: {
    clientBundle: {
      icons: [
        'lucide:lock',
        'lucide:user-plus',
        'lucide:eye',
        'lucide:eye-off',
      ],
    },
    serverBundle: {
      collections: ['lucide'],
    },
  },
  nitro: {
    preset: 'node-server',
  },
  css: [fileURLToPath(new URL('./app/assets/css/main.css', import.meta.url))],
})
