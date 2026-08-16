export default defineNuxtConfig({
  extends: ['@nuxt-app/layer-base', '@nuxt-app/layer-auth'],
  ssr: false,
  colorMode: {
    preference: 'dark',
  },
})
