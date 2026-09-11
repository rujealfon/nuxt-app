import { z } from 'zod'

const envSchema = z.object({
  databaseUrl: z.string().min(1, 'DATABASE_URL is required'),
  databaseDriver: z.enum(['', 'pg', 'neon']).default(''),
  redisUrl: z.string().min(1, 'REDIS_URL is required'),
  corsOrigins: z.string().default(''),
})

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()

  const parsed = envSchema.safeParse({
    databaseUrl: config.databaseUrl,
    databaseDriver: config.databaseDriver,
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
