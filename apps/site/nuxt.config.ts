export default defineNuxtConfig({
  extends: ['@nuxt-app/layer-base'],
  nitro: {
    preset: 'static',
    prerender: {
      crawlLinks: true,
      routes: ['/'],
    },
  },
  routeRules: {
    '/**': { prerender: true },
  },
})
