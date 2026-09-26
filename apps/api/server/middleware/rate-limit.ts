// Rate limits the API's own Nitro routes. Better Auth rate-limits `/api/auth/*`
// itself (with stricter per-endpoint rules); health checks are exempt so
// monitoring isn't throttled, and docs are exempt as static reference content.
import { authMount, versionedOperations } from '@nuxt-app/config'
import { defineEventHandler, getRequestIP, setHeader } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { isDocsPath, requestPath } from '../utils/api-paths'
import { domainFailure } from '../utils/domain-failure'
import { createRateLimitStorage } from '../utils/rate-limit'
import { rateLimitPolicy } from '../utils/rate-limit-policy'

const EXEMPT_PATHS = [authMount, '/api/health']

// Known operations keep their own budgets. Every other API path shares one
// bounded bucket, so arbitrary URLs and methods cannot create Redis keys.
const knownOperations = new Set(
  Object.entries(versionedOperations).flatMap(([version, operations]) =>
    operations.map(operation => `${operation.method.toUpperCase()}:/api/${version}${operation.suffix}`),
  ),
)

const storage = createRateLimitStorage()

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!config.rateLimitEnabled) {
    return
  }

  const path = requestPath(event)

  const exempt = !path.startsWith('/api/')
    || EXEMPT_PATHS.some(prefix => path === prefix || path.startsWith(`${prefix}/`))
    || isDocsPath(path)

  if (exempt) {
    return
  }

  // Vercel replaces client-supplied forwarding headers. Direct Nitro servers
  // must use the connection address instead of trusting a request header.
  const ip = getRequestIP(event, { xForwardedFor: process.env.VERCEL === '1' }) || 'unknown'
  // Nitro treats one trailing slash as the same route. Keep aliases in one
  // bucket instead of giving a known operation a second allowance.
  const routePath = path.endsWith('/') ? path.slice(0, -1) : path
  const operation = `${event.method}:${routePath}`
  const bucket = knownOperations.has(operation) ? operation : 'unknown'
  const { allowed, retryAfter } = await storage.consume(
    `${ip}:${bucket}`,
    rateLimitPolicy,
  )

  if (!allowed) {
    setHeader(event, 'x-retry-after', String(retryAfter))
    setHeader(event, 'retry-after', retryAfter ?? 0)
    throw domainFailure('rate_limited')
  }
})
