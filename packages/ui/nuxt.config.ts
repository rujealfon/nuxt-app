import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@vueuse/nuxt',
  ],
  css: [
    fileURLToPath(new URL('./app/assets/css/main.css', import.meta.url)),
  ],
})
