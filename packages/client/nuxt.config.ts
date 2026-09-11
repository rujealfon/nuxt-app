export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
  ],
  runtimeConfig: {
    public: {
      // Required by the auth composables. Each app overrides this.
      apiBase: '',
    },
  },
})
