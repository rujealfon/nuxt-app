import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime'
import { z } from 'zod'

export const envSchema = z.object({
  databaseUrl: z.string().min(1, 'DATABASE_URL is required'),
  databaseDriver: z.enum(['', 'pg', 'neon']).default(''),
  betterAuthSecret: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  betterAuthUrl: z.url('BETTER_AUTH_URL must be a valid URL'),
  redisUrl: z.string().min(1, 'REDIS_URL is required'),
  corsOrigins: z.string().default(''),
})

// Boot-time validation of a fixed, small shape. AOT compilation is a cheap
// demonstration of the fast path; `strict` is the part that earns its keep
// here: if a future edit makes this schema uncompilable (async refinement,
// `z.coerce.*`, a recursive shape, ...) startup fails loudly instead of the
// parser silently ejecting to the runtime implementation.
export const compiledEnvSchema = z.compile(envSchema, { strict: true })

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()

  const parsed = compiledEnvSchema.safeParse({
    databaseUrl: config.databaseUrl,
    databaseDriver: config.databaseDriver,
    betterAuthSecret: config.betterAuthSecret,
    betterAuthUrl: config.betterAuthUrl,
    redisUrl: config.redisUrl,
    corsOrigins: config.corsOrigins,
  })

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
})
