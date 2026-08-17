import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'
import { loadRootEnv } from '../base/load-root-env'

loadRootEnv()

const apiUrl = (process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '')

export default defineNuxtConfig({
  $meta: { name: 'auth' },
  alias: {
    // Follows `hc<AppType>` into apps/api (no layer source imports `@api`).
    '@api': fileURLToPath(new URL('../../apps/api/src', import.meta.url)),
  },
  modules: ['@pinia/nuxt', '@pinia/colada-nuxt'],
  runtimeConfig: {
    public: {
      apiUrl,
    },
  },
  routeRules: {
    '/__api/**': { proxy: `${apiUrl}/**` },
  },
})
