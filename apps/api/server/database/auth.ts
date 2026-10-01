import type { Database } from '../utils/db-core'
import type { RateLimitStorage } from '../utils/rate-limit-policy'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { bearer } from 'better-auth/plugins/bearer'
import { authClientIpHeader } from '../utils/auth-ip'
import { assertAuthOrigins } from '../utils/auth-origins'
import { boundedAuthRateLimitStorage } from '../utils/auth-rate-limit-policy'
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
  const trustedOrigins = config.trustedOrigins ?? []
  assertAuthOrigins(trustedOrigins)
  // Better Auth also appends these sources to its allowlist independently.
  assertAuthOrigins((process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '').split(',').filter(Boolean))
  if (config.baseURL) {
    assertAuthOrigins([new URL(config.baseURL).origin])
  }

  const endpointPaths: string[] = []
  const auth = betterAuth({
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
    // route removes that header and session tokens in auth JSON unless the
    // request has an explicitly allowed native origin; see ADR-0003.
    plugins: config.bearerEnabled ? [bearer()] : [],
    rateLimit: {
      enabled: true,
      window: rateLimitPolicy.window,
      max: rateLimitPolicy.max,
      customStorage: config.rateLimitStorage
        ? boundedAuthRateLimitStorage(config.rateLimitStorage, endpointPaths)
        : undefined,
    },
    advanced: {
      disableOriginCheck: false,
      ipAddress: { ipAddressHeaders: [authClientIpHeader] },
    },
    trustedOrigins,
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

  // Better Auth attaches endpoint metadata synchronously, including on
  // getSession whose specialized public type does not declare its path.
  for (const endpoint of Object.values(auth.api)) {
    if ('path' in endpoint && typeof endpoint.path === 'string') {
      endpointPaths.push(endpoint.path)
    }
  }

  return auth
}
