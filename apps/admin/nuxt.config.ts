import { apiBaseFor, appPorts } from '@mysite/config'

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
    adminUser: process.env.NUXT_ADMIN_USER || 'admin',
    adminPassword: process.env.NUXT_ADMIN_PASSWORD || '',
    public: {
      appName: 'admin',
      siteDomain: 'mysite.com',
      webUrl: `http://localhost:${appPorts.web}`,
      appUrl: `http://localhost:${appPorts.app}`,
      adminUrl: `http://localhost:${appPorts.admin}`,
      apiBase: apiBaseFor(process.env.NUXT_PUBLIC_API_BASE),
    },
  },
})
