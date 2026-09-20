import { apiBaseFor, currentApiVersion, siteUrls } from '@nuxt-app/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  extends: ['@nuxt-app/ui', '@nuxt-app/client'],
  imports: { autoImport: false },
  components: { dirs: [] },
  runtimeConfig: {
    public: {
      appName: 'app',
      ...siteUrls,
      apiBase: apiBaseFor(process.env.NUXT_PUBLIC_API_BASE),
      apiVersion: process.env.NUXT_PUBLIC_API_VERSION || currentApiVersion,
    },
  },
})
