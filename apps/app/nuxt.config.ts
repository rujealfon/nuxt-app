export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3001',
    },
  },

  vite: {
    optimizeDeps: {
      include: ['@mysite/auth', '@mysite/types'],
    },
  },
})
