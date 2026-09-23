import { fileURLToPath } from 'node:url'

const scalarDocsAsset = {
  baseName: 'scalar-docs',
  dir: fileURLToPath(new URL('./node_modules/@scalar/api-reference/dist/browser', import.meta.url)),
  pattern: 'standalone.js',
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // API-only: no Vue pages. Unmatched paths are JSON 404s from server/routes.
  pages: false,
  devtools: { enabled: true },
  modules: ['vite-doctor/nuxt'],
  // Config is read once from module scope (no request event exists there by
  // design), and the CORS middleware intentionally passes non-OPTIONS requests
  // through instead of asserting a single method.
  doctor: {
    extends: 'auto',
    rules: {
      'nitro/request/prefer-assert-method': 'off',
      'nitro/runtime/require-event-runtime-config-in-server': 'off',
    },
  },
  imports: { autoImport: false },
  app: {
    head: {
      meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    },
  },
  nitro: {
    // Error adapter: renders the API error contract for every thrown failure.
    errorHandler: fileURLToPath(new URL('./server/error-adapter', import.meta.url)),
  },
  // Embed the Scalar IIFE only in development. Production builds omit the
  // 3.7 MB bundle; the docs guard 404s those routes at compile time via
  // `import.meta.dev`. Only `standalone.js` is included; the rest of
  // `dist/browser` stays out of the server bundle.
  $development: {
    nitro: {
      serverAssets: [scalarDocsAsset],
    },
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    databaseDriver: process.env.DATABASE_DRIVER || '',
    betterAuthSecret: process.env.BETTER_AUTH_SECRET || '',
    betterAuthUrl: process.env.BETTER_AUTH_URL || '',
    redisUrl: process.env.REDIS_URL || '',
    corsOrigins: process.env.CORS_ORIGINS || '',
    // Opt-in: the bearer plugin exposes the session token to page JS (see
    // ADR-0003), so only a deployment that serves a native client enables it.
    authBearerEnabled: process.env.AUTH_BEARER_ENABLED === 'true',
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  },
})
