import { currentApiVersion } from '@nuxt-app/config'

export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
  ],
  runtimeConfig: {
    public: {
      // Required by the auth composables. Each app overrides this.
      apiBase: '',
      // Version used by useApi() for versioned routes. Each app overrides this.
      apiVersion: currentApiVersion,
    },
  },
})
