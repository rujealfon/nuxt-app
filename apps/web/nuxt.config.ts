import process from 'node:process'
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  extends: ['@nuxt-app/layer-base'],
  alias: {
    '@web': fileURLToPath(new URL('./app', import.meta.url)),
  },
  runtimeConfig: {
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000',
    },
  },
  nitro: {
    preset: 'static',
    prerender: {
      crawlLinks: true,
      routes: ['/'],
    },
  },
  routeRules: {
    '/**': { prerender: true },
  },
})
