import process from 'node:process'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  API_URL: z.url().default('http://localhost:3001'),
  APP_URL: z.url().default('http://localhost:3000'),
  ADMIN_URL: z.url().default('http://localhost:3002'),
  WEB_URL: z.url().optional(),
  MARKETING_URL: z.url().optional(),
  COOKIE_DOMAIN: z.string().optional().transform(value => value || undefined),
})

export const env = envSchema.parse(process.env)

export const isDev = env.NODE_ENV === 'development'

export const allowedOrigins = [
  env.APP_URL,
  env.ADMIN_URL,
  env.WEB_URL ?? env.MARKETING_URL ?? 'http://localhost:3003',
  ...(isDev ? [env.API_URL] : []),
]
