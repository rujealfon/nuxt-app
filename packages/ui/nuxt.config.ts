import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@vueuse/nuxt',
  ],
  components: { dirs: [] },
  css: [
    fileURLToPath(new URL('./app/assets/css/main.css', import.meta.url)),
  ],
})
