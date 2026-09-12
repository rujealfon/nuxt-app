import { fileURLToPath } from 'node:url'

const servicesDir = fileURLToPath(new URL('./server/services', import.meta.url))

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    },
  },
  nitro: {
    imports: {
      // Domain services shared across API versions; auto-imported like utils.
      dirs: [`${servicesDir}/**/*`],
    },
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    databaseDriver: process.env.DATABASE_DRIVER || '',
    betterAuthSecret: process.env.BETTER_AUTH_SECRET || '',
    betterAuthUrl: process.env.BETTER_AUTH_URL || '',
    redisUrl: process.env.REDIS_URL || '',
    corsOrigins: process.env.CORS_ORIGINS || '',
  },
})
