import type { Context } from 'hono'
import type { Store } from 'hono-rate-limiter'
import { env } from '@api/env.js'
import { rateLimitRedis } from '@api/redis.js'
import { getConnInfo } from '@hono/node-server/conninfo'
import { MemoryStore, rateLimiter, RedisStore } from 'hono-rate-limiter'
import * as HttpStatusPhrases from 'stoker/http-status-phrases'

const tooMany = { message: HttpStatusPhrases.TOO_MANY_REQUESTS } as const

function clientKey(c: Context): string {
  try {
    const address = getConnInfo(c).remote.address
    if (address)
      return address
  }
  catch {
    // app.request() and other non-Node fetches have no socket
  }

  const forwarded = c.req.header('x-forwarded-for')
  if (forwarded) {
    const [first] = forwarded.split(',')
    if (first?.trim())
      return first.trim()
  }

  return 'unknown'
}

function skipPublic(c: Context) {
  if (c.req.method === 'OPTIONS')
    return true
  const path = c.req.path
  return path === '/' || path === '/health'
}

function createRedisStore(prefix: string): Store {
  let inner: RedisStore | undefined
  let initOptions: Parameters<RedisStore['init']>[0] | undefined

  function store() {
    if (!inner) {
      inner = new RedisStore({ client: rateLimitRedis, prefix })
      if (initOptions)
        inner.init(initOptions)
    }
    return inner
  }

  return {
    init(options) {
      initOptions = options
    },
    increment: key => store().increment(key),
    decrement: key => store().decrement(key),
    resetKey: key => store().resetKey(key),
    get: key => store().get(key),
  }
}

function createStore(prefix: string) {
  if (env.NODE_ENV === 'test')
    return new MemoryStore()
  return createRedisStore(prefix)
}

export function createRateLimit(options: {
  limit: number
  windowMs?: number
  prefix?: string
  skip?: (c: Context) => boolean
  store?: MemoryStore | RedisStore | Store
}) {
  return rateLimiter({
    windowMs: options.windowMs ?? env.RATE_LIMIT_WINDOW_MS,
    limit: options.limit,
    keyGenerator: clientKey,
    message: tooMany,
    store: options.store ?? createStore(options.prefix ?? 'rl:'),
    skip: options.skip,
  })
}

export const rateLimit = createRateLimit({
  limit: env.RATE_LIMIT_MAX,
  prefix: 'rl:',
  skip: skipPublic,
})

export const authRateLimit = createRateLimit({
  limit: env.AUTH_RATE_LIMIT_MAX,
  prefix: 'rl:auth:',
})
