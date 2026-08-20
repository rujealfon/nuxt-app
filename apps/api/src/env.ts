import process from 'node:process'
import { z } from 'zod'
import { loadEnv } from '#api/load-env.js'

loadEnv()

export function isPlainRedisToUpstash(connectionString: string) {
  let url: URL
  try {
    url = new URL(connectionString)
  }
  catch {
    return false
  }

  return url.protocol === 'redis:' && url.hostname.endsWith('.upstash.io')
}

/**
 * Vercel gives each project a stable per-branch preview domain
 * (`<project>-git-<branch-slug>-<scope>.vercel.app`), but there is no
 * built-in var for a *sibling* project's preview URL. All four projects
 * in this repo deploy from the same branch and scope, so swap the
 * project-name prefix on our own `VERCEL_BRANCH_URL` to get the sibling's.
 */
function resolveVercelPreviewUrl(targetProjectName: string): string | undefined {
  if (process.env.VERCEL_ENV !== 'preview')
    return undefined

  const branchUrl = process.env.VERCEL_BRANCH_URL
  const gitIndex = branchUrl?.indexOf('-git-')
  if (!branchUrl || gitIndex === undefined || gitIndex < 0)
    return undefined

  return `https://${targetProjectName}${branchUrl.slice(gitIndex)}`
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  API_URL: z.url().default('http://localhost:3001'),
  APP_URL: z.url().default('http://localhost:3000'),
  ADMIN_URL: z.url().default('http://localhost:3002'),
  WEB_URL: z.url().default('http://localhost:3003'),
  COOKIE_DOMAIN: z.string().optional().transform(value => value || undefined),
  REDIS_URL: z.url().default('redis://localhost:6380').refine(
    value => !isPlainRedisToUpstash(value),
    { error: 'Use rediss:// (TLS), not redis://, with Upstash — its endpoints enforce TLS.' },
  ),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  TRUST_PROXY: z.string().optional().transform((value) => {
    if (!value)
      return false
    return ['1', 'true', 'yes'].includes(value.trim().toLowerCase())
  }),
  DATABASE_URL: z.url(),
  DATABASE_URL_TEST: z.url().optional(),
  DATABASE_URL_UNPOOLED: z.url().optional(),
})

const parsed = envSchema.safeParse({
  ...process.env,
  APP_URL: process.env.APP_URL || resolveVercelPreviewUrl('nuxt-app-app'),
  ADMIN_URL: process.env.ADMIN_URL || resolveVercelPreviewUrl('nuxt-app-admin'),
  WEB_URL: process.env.WEB_URL || resolveVercelPreviewUrl('nuxt-app-web'),
})

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
  env.WEB_URL,
  ...(isDev ? [env.API_URL] : []),
]
