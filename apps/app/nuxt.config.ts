import { apiBaseFor, currentApiVersion, sessionTransportFor, siteUrls } from '@nuxt-app/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  extends: ['@nuxt-app/ui', '@nuxt-app/client'],
  modules: ['vite-doctor/nuxt'],
  // SPA with no SEO surface; `useHead()` stays the documented convention.
  doctor: {
    extends: 'auto',
    rules: {
      'nuxt/seo/prefer-seo-composables': 'off',
    },
  },
  imports: { autoImport: false },
  components: { dirs: [] },
  typescript: {
    tsConfig: {
      include: ['../test/**/*'],
    },
  },
  runtimeConfig: {
    public: {
      appName: 'app',
      ...siteUrls,
      apiBase: apiBaseFor(process.env.NUXT_PUBLIC_API_BASE),
      apiVersion: process.env.NUXT_PUBLIC_API_VERSION || currentApiVersion,
      sessionTransport: sessionTransportFor(process.env.NUXT_PUBLIC_SESSION_TRANSPORT),
    },
  },
})
