import { currentApiVersion } from '@mysite/config'

export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
  ],
  runtimeConfig: {
    public: {
      // Required by the auth composables. Each app overrides this.
      apiBase: '',
      // Product API version used by useApi(). Each app overrides this.
      apiVersion: currentApiVersion,
    },
  },
})
