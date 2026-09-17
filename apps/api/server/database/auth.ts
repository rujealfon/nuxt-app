import type { Database } from '../utils/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import * as schema from './schema'

export interface RateLimitStorage {
  consume: (
    key: string,
    rule: { window: number, max: number },
  ) => Promise<{ allowed: boolean, retryAfter: number | null }>
}

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
      window: 60,
      max: 100,
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
