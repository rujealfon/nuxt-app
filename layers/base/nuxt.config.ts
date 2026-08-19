import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'
import { loadRootEnv } from './load-root-env'

loadRootEnv()

export default defineNuxtConfig({
  $meta: { name: 'base' },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxt/fonts'],
  fonts: {
    provider: 'local',
    families: [
      { name: 'Space Grotesk', weights: ['400', '500', '600', '700'] },
      { name: 'Space Mono', weights: ['400', '700'] },
    ],
  },
  colorMode: {
    classSuffix: '',
    fallback: 'light',
    preference: 'system',
  },
  icon: {
    clientBundle: {
      icons: [
        'lucide:eye',
        'lucide:eye-off',
        'lucide:lock',
        'lucide:moon',
        'lucide:sun',
        'lucide:user-plus',
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
