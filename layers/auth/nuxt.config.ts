import process from 'node:process'
import { API_PROXY_PREFIX } from '@nuxt-app/auth'
import { loadRootEnv } from '@nuxt-app/layer-base/load-root-env'
import { defineNuxtConfig } from 'nuxt/config'

loadRootEnv()

const apiUrl = (process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '')

export default defineNuxtConfig({
  $meta: { name: 'auth' },
  modules: ['@pinia/nuxt', '@pinia/colada-nuxt'],
  runtimeConfig: {
    public: {
      apiUrl,
    },
  },
  routeRules: {
    [`${API_PROXY_PREFIX}/**`]: { proxy: `${apiUrl}/**` },
  },
})
