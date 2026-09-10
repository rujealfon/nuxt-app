export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      // Required by the auth composables. Each app overrides this.
      apiBase: '',
    },
  },
})
