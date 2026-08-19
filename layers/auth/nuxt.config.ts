import process from 'node:process'
import { API_PROXY_PREFIX } from '@nuxt-app/auth'
import { loadRootEnv } from '@nuxt-app/layer-base/load-root-env'
import { resolveVercelPreviewUrl } from '@nuxt-app/layer-base/vercel-preview-url'
import { parsePublicUrl } from '@nuxt-app/types'
import { defineNuxtConfig } from 'nuxt/config'

loadRootEnv()

const apiUrl = parsePublicUrl(
  process.env.NUXT_PUBLIC_API_URL || resolveVercelPreviewUrl('nuxt-app-api'),
  'http://localhost:3001',
)

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
