import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'
import { loadRootEnv } from './load-root-env'

loadRootEnv()

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
    // Docker/local keep a Node server. Vercel SPAs use static files + CDN rewrites
    // (no __fallback serverless function). An SSR app should set preset: 'vercel'.
    preset: process.env.VERCEL ? 'vercel-static' : 'node-server',
  },
  css: [fileURLToPath(new URL('./app/assets/css/main.css', import.meta.url))],
})
