import { appPorts } from '@nuxt-app/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: ['@nuxt-app/ui'],
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
      webUrl: `http://localhost:${appPorts.web}`,
      appUrl: `http://localhost:${appPorts.app}`,
      adminUrl: `http://localhost:${appPorts.admin}`,
    },
  },
})
