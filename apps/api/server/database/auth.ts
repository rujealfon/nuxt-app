import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import * as schema from './schema'

export interface AuthConfig {
  secret: string
  baseURL: string
  trustedOrigins?: string[]
}

export function createAuth(
  db: NodePgDatabase<typeof schema>,
  config: AuthConfig,
) {
  return betterAuth({
    appName: 'mysite',
    baseURL: config.baseURL,
    secret: config.secret,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
    }),
    emailAndPassword: {
      enabled: true,
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
