import { apiBaseFor, appPorts, currentApiVersion } from '@mysite/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  extends: ['@mysite/ui', '@mysite/client'],
  app: {
    head: {
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    },
  },
  runtimeConfig: {
    public: {
      appName: 'admin',
      webUrl: `http://localhost:${appPorts.web}`,
      appUrl: `http://localhost:${appPorts.app}`,
      adminUrl: `http://localhost:${appPorts.admin}`,
      apiBase: apiBaseFor(process.env.NUXT_PUBLIC_API_BASE),
      apiVersion: process.env.NUXT_PUBLIC_API_VERSION || currentApiVersion,
    },
  },
})
