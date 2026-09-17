import type { Database } from '../utils/db'
import type { RateLimitStorage } from '../utils/rate-limit'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { rateLimitPolicy } from '../utils/rate-limit'
import * as schema from './schema'

export interface AuthConfig {
  secret: string
  baseURL: string
  trustedOrigins?: string[]
  rateLimitStorage?: RateLimitStorage
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
