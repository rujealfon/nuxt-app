import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@vueuse/nuxt',
    'vite-doctor/nuxt',
  ],
  doctor: { extends: 'auto' },
  // Auto-imports are disabled repo-wide; the layer sets it too so its
  // standalone `nuxt doctor` run matches how the apps consume it.
  imports: { autoImport: false },
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
