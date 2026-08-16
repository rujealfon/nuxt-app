import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  extends: ['@nuxt-app/layer-base', '@nuxt-app/layer-auth'],
  alias: {
    '@app': fileURLToPath(new URL('./app', import.meta.url)),
  },
  ssr: false,
})
