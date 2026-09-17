// Rate limits the API's own Nitro routes. Better Auth rate-limits `/api/auth/*`
// itself (with stricter per-endpoint rules); health checks are exempt so
// monitoring isn't throttled, and docs are exempt as static reference content.
const EXEMPT_PREFIXES = ['/api/auth', '/api/health', '/api/docs', '/api/openapi.json']

const storage = createRateLimitStorage()

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!config.rateLimitEnabled) {
    return
  }

  const path = event.path

  const exempt = !path.startsWith('/api/')
    || EXEMPT_PREFIXES.some(prefix => path.startsWith(prefix))

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
    throw productFailure('rate_limited')
  }
})
