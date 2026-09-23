import { siteUrls } from '@nuxt-app/config'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: ['@nuxt-app/ui'],
  modules: ['vite-doctor/nuxt'],
  // `useHead()` is the documented convention for page metadata here; the SEO
  // composable preference is advisory and adds nothing to a prerendered page.
  doctor: {
    extends: 'auto',
    rules: {
      'nuxt/seo/prefer-seo-composables': 'off',
    },
  },
  imports: { autoImport: false },
  components: { dirs: [] },
  typescript: {
    tsConfig: {
      include: ['../test/**/*'],
    },
  },
  routeRules: {
    '/': { prerender: true },
  },
  nitro: {
    prerender: {
      crawlLinks: true,
    },
  },
  runtimeConfig: {
    public: {
      appName: 'web',
      ...siteUrls,
    },
  },
})
