import process from 'node:process'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3001',
    },
  },
  vite: {
    optimizeDeps: {
      include: ['@nuxt-app/auth', '@nuxt-app/types'],
    },
  },
})
