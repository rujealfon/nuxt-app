import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@vueuse/nuxt',
  ],
  components: { dirs: [] },
  typescript: {
    tsConfig: {
      include: ['../test/**/*'],
    },
  },
  css: [
    fileURLToPath(new URL('./app/assets/css/main.css', import.meta.url)),
  ],
})
