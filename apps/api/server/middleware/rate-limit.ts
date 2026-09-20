// Rate limits the API's own Nitro routes. Better Auth rate-limits `/api/auth/*`
// itself (with stricter per-endpoint rules); health checks are exempt so
// monitoring isn't throttled, and docs are exempt as static reference content.
import { defineEventHandler, getMethod, getRequestIP, setHeader } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { isDocsPath, requestPath } from '../utils/api-paths'
import { domainFailure } from '../utils/domain-failure'
import { createRateLimitStorage, rateLimitPolicy } from '../utils/rate-limit'

const EXEMPT_PREFIXES = ['/api/auth', '/api/health']

const storage = createRateLimitStorage()

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!config.rateLimitEnabled) {
    return
  }

  const path = requestPath(event)

  const exempt = !path.startsWith('/api/')
    || EXEMPT_PREFIXES.some(prefix => path.startsWith(prefix))
    || isDocsPath(path)

  if (exempt) {
    return
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const { allowed, retryAfter } = await storage.consume(
    `${ip}:${getMethod(event)}:${path}`,
    rateLimitPolicy,
  )

  if (!allowed) {
    setHeader(event, 'x-retry-after', String(retryAfter))
    setHeader(event, 'retry-after', retryAfter ?? 0)
    throw domainFailure('rate_limited')
  }
})
