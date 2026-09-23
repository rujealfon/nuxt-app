import { currentApiVersion, defaultSessionTransport } from '@nuxt-app/config'

export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
    'vite-doctor/nuxt',
  ],
  doctor: {
    extends: 'auto',
    rules: {
      // `useApiFetch` is a `createUseFetch` export from a scanned composables
      // file; Nuxt injects its de-duplication key at build time, so the
      // prepare-time manifest cannot see it.
      'nuxt/fetch/keyed-composable-registration-required': 'off',
    },
  },
  // Auto-imports are disabled repo-wide; the layer sets it too so its
  // standalone `nuxt doctor` run matches how the apps consume it.
  imports: { autoImport: false },
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
