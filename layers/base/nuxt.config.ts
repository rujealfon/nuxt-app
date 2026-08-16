import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  nitro: {
    preset: 'node-server',
  },
  css: [fileURLToPath(new URL('./app/assets/css/main.css', import.meta.url))],
  vite: {
    plugins: [tailwindcss()],
  },
})
