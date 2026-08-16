import process from 'node:process'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  API_URL: z.url().default('http://localhost:3001'),
  APP_URL: z.url().default('http://localhost:3000'),
  ADMIN_URL: z.url().default('http://localhost:3002'),
  WEB_URL: z.url().optional(),
  MARKETING_URL: z.url().optional(),
  COOKIE_DOMAIN: z.string().optional().transform(value => value || undefined),
  REDIS_URL: z.url().default('redis://localhost:6380'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid env:')
  console.error(z.prettifyError(parsed.error))
  process.exit(1)
}

export const env = parsed.data

export const isDev = env.NODE_ENV === 'development'

export const allowedOrigins = [
  env.APP_URL,
  env.ADMIN_URL,
  env.WEB_URL ?? env.MARKETING_URL ?? 'http://localhost:3003',
  ...(isDev ? [env.API_URL] : []),
]
