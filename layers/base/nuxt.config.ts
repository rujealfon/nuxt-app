import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  $meta: { name: 'base' },
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
    // Docker/local keep a Node server. Vercel sets VERCEL and needs its preset.
    preset: process.env.VERCEL ? 'vercel' : 'node-server',
  },
  css: [fileURLToPath(new URL('./app/assets/css/main.css', import.meta.url))],
})
