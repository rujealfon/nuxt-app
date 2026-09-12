// Rate limits the API's own Nitro routes. Better Auth rate-limits `/api/auth/*`
// itself (with stricter per-endpoint rules); health checks are exempt so
// monitoring isn't throttled.
const WINDOW_SECONDS = 60
const MAX_REQUESTS = 100
const EXEMPT_PREFIXES = ['/api/auth', '/api/health']

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
    { window: WINDOW_SECONDS, max: MAX_REQUESTS },
  )

  if (!allowed) {
    setHeader(event, 'x-retry-after', String(retryAfter))
    setHeader(event, 'retry-after', retryAfter ?? 0)
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }
})
