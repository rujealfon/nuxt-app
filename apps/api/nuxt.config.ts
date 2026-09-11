export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    },
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    databaseDriver: process.env.DATABASE_DRIVER || '',
    redisUrl: process.env.REDIS_URL || '',
    corsOrigins: process.env.CORS_ORIGINS || '',
  },
})
