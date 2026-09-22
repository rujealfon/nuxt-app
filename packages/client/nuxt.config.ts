import { currentApiVersion, defaultSessionTransport } from '@nuxt-app/config'

export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
  ],
  typescript: {
    tsConfig: {
      include: ['../test/**/*'],
    },
  },
  runtimeConfig: {
    public: {
      // Required by the auth composables. Each app overrides this.
      apiBase: '',
      // Version used by useApi() for versioned routes. Each app overrides this.
      apiVersion: currentApiVersion,
      // How the auth and API clients carry a session. Apps override this
      // through NUXT_PUBLIC_SESSION_TRANSPORT; see `sessionTransportFor`.
      sessionTransport: defaultSessionTransport,
    },
  },
})
