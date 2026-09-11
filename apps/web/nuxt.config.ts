import { apiBaseFor, appPorts } from '@mysite/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: ['@mysite/ui'],
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
      siteDomain: 'mysite.com',
      webUrl: `http://localhost:${appPorts.web}`,
      appUrl: `http://localhost:${appPorts.app}`,
      adminUrl: `http://localhost:${appPorts.admin}`,
      apiBase: apiBaseFor(process.env.NUXT_PUBLIC_API_BASE),
    },
  },
})
