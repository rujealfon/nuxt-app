import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  extends: ['@nuxt-app/layer-base', '@nuxt-app/layer-auth'],
  alias: {
    '@admin': fileURLToPath(new URL('./app', import.meta.url)),
  },
  components: [
    { path: '~/features', pathPrefix: false, pattern: '*/components/**/*.vue' },
    '~/components',
  ],
  imports: {
    dirs: ['features/*/composables'],
  },
  ssr: false,
  colorMode: {
    preference: 'dark',
  },
})
