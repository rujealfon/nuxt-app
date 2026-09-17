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
    // Renders the product error contract for every thrown failure.
    errorHandler: fileURLToPath(new URL('./server/error', import.meta.url)),
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    databaseDriver: process.env.DATABASE_DRIVER || '',
    betterAuthSecret: process.env.BETTER_AUTH_SECRET || '',
    betterAuthUrl: process.env.BETTER_AUTH_URL || '',
    redisUrl: process.env.REDIS_URL || '',
    corsOrigins: process.env.CORS_ORIGINS || '',
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  },
})
