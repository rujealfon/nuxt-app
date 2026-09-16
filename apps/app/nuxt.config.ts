import { apiBaseFor, appPorts, currentApiVersion } from '@nuxt-app/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  extends: ['@nuxt-app/ui', '@nuxt-app/client'],
  runtimeConfig: {
    public: {
      appName: 'app',
      webUrl: `http://localhost:${appPorts.web}`,
      appUrl: `http://localhost:${appPorts.app}`,
      adminUrl: `http://localhost:${appPorts.admin}`,
      apiBase: apiBaseFor(process.env.NUXT_PUBLIC_API_BASE),
      apiVersion: process.env.NUXT_PUBLIC_API_VERSION || currentApiVersion,
    },
  },
})
