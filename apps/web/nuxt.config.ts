import { siteUrls } from '@nuxt-app/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: ['@nuxt-app/ui'],
  imports: { autoImport: false },
  components: { dirs: [] },
  routeRules: {
    '/': { prerender: true },
  },
  nitro: {
    prerender: {
      crawlLinks: true,
    },
  },
  runtimeConfig: {
    public: {
      appName: 'web',
      ...siteUrls,
    },
  },
})
