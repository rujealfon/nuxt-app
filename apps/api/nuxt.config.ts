import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // API-only: no Vue pages. Unmatched paths are JSON 404s from server/routes.
  pages: false,
  devtools: { enabled: true },
  app: {
    head: {
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    },
  },
  nitro: {
    // Renders the API error contract for every thrown failure.
    errorHandler: fileURLToPath(new URL('./server/error', import.meta.url)),
    // Embeds the Scalar UI bundle for `/api/docs-assets/*` so docs work
    // offline and stay version-pinned with the API. Only `standalone.js` is
    // served; the sibling build files are inert build artifacts.
    serverAssets: [
      {
        baseName: 'scalar-docs',
        dir: fileURLToPath(new URL('./node_modules/@scalar/api-reference/dist/browser', import.meta.url)),
      },
    ],
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    databaseDriver: process.env.DATABASE_DRIVER || '',
    betterAuthSecret: process.env.BETTER_AUTH_SECRET || '',
    betterAuthUrl: process.env.BETTER_AUTH_URL || '',
    redisUrl: process.env.REDIS_URL || '',
    corsOrigins: process.env.CORS_ORIGINS || '',
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    // Scalar docs are development-only: on for `nuxt dev`, off in production
    // builds unless explicitly enabled (contract tests enable it to exercise
    // the docs routes against prod builds).
    docsEnabled: process.env.DOCS_ENABLED === 'true' || process.env.NODE_ENV === 'development',
  },
})
