import { z } from 'zod'

const envSchema = z.object({
  databaseUrl: z.string().min(1, 'DATABASE_URL is required'),
  databaseDriver: z.enum(['', 'pg', 'neon']).default(''),
  betterAuthSecret: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  betterAuthUrl: z.url('BETTER_AUTH_URL must be a valid URL'),
  corsOrigins: z.string().default(''),
})

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()

  const parsed = envSchema.safeParse({
    databaseUrl: config.databaseUrl,
    databaseDriver: config.databaseDriver,
    betterAuthSecret: config.betterAuthSecret,
    betterAuthUrl: config.betterAuthUrl,
    corsOrigins: config.corsOrigins,
  })

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
})
