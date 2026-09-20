import { fileURLToPath } from 'node:url'

// Scalar docs are development-only: on for `nuxt dev`, off in production
// builds unless explicitly enabled (contract tests enable it to exercise the
// docs routes against prod builds). Resolved once so the Scalar bundle is only
// embedded when the docs can actually be served.
const docsEnabled = process.env.DOCS_ENABLED === 'true' || process.env.NODE_ENV === 'development'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // API-only: no Vue pages. Unmatched paths are JSON 404s from server/routes.
  pages: false,
  devtools: { enabled: true },
  imports: { autoImport: false },
  app: {
    head: {
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    },
  },
  nitro: {
    // Error adapter: renders the API error contract for every thrown failure.
    errorHandler: fileURLToPath(new URL('./server/error-adapter', import.meta.url)),
    // Embeds only the Scalar IIFE the docs page loads, and only when docs are
    // enabled at build time — otherwise the 3.7 MB bundle would ship in every
    // production server for a route that always 404s. The rest of
    // `dist/browser` (chunks, ESM, source maps) stays out of the server
    // bundle; HTTP still 404s anything but `standalone.js`.
    ...(docsEnabled
      ? {
          serverAssets: [
            {
              baseName: 'scalar-docs',
              dir: fileURLToPath(new URL('./node_modules/@scalar/api-reference/dist/browser', import.meta.url)),
              pattern: 'standalone.js',
            },
          ],
        }
      : {}),
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    databaseDriver: process.env.DATABASE_DRIVER || '',
    betterAuthSecret: process.env.BETTER_AUTH_SECRET || '',
    betterAuthUrl: process.env.BETTER_AUTH_URL || '',
    redisUrl: process.env.REDIS_URL || '',
    corsOrigins: process.env.CORS_ORIGINS || '',
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    docsEnabled,
  },
})
