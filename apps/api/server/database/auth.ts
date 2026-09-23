import type { Database } from '../utils/db-core'
import type { RateLimitStorage } from '../utils/rate-limit-policy'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer } from 'better-auth/plugins/bearer'
import { rateLimitPolicy } from '../utils/rate-limit-policy'
import * as schema from './schema'

export interface AuthConfig {
  secret: string
  baseURL: string
  trustedOrigins?: string[]
  rateLimitStorage?: RateLimitStorage
  bearerEnabled?: boolean
}

export function createAuth(
  db: Database,
  config: AuthConfig,
) {
  return betterAuth({
    appName: 'nuxt-app',
    baseURL: config.baseURL,
    secret: config.secret,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    // Accepts the session token from an `Authorization: Bearer` header as well
    // as from the session cookie.
    //
    // The after-hook emits `set-auth-token` on cookie sign-ins too. The auth
    // route removes that header unless the request has an explicitly allowed
    // native origin; see docs/adr/0003-bearer-tokens-for-native-clients.md.
    plugins: config.bearerEnabled ? [bearer()] : [],
    rateLimit: {
      enabled: true,
      window: rateLimitPolicy.window,
      max: rateLimitPolicy.max,
      customStorage: config.rateLimitStorage,
    },
    trustedOrigins: config.trustedOrigins ?? [],
    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: true,
          defaultValue: 'user',
          input: false,
        },
      },
    },
  })
}
