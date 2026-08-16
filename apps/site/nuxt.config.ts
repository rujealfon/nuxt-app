import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  extends: ['@nuxt-app/layer-base'],
  alias: {
    '@site': fileURLToPath(new URL('./app', import.meta.url)),
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
