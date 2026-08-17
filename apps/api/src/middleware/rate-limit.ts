import type { Context } from 'hono'
import type { MemoryStore, Store } from 'hono-rate-limiter'
import { env } from '@api/env.js'
import { rateLimitRedis } from '@api/redis.js'
import { getConnInfo } from '@hono/node-server/conninfo'
import { rateLimiter, RedisStore } from 'hono-rate-limiter'
import * as HttpStatusPhrases from 'stoker/http-status-phrases'

const tooMany = { message: HttpStatusPhrases.TOO_MANY_REQUESTS } as const

function firstForwardedAddress(forwardedFor?: string | null): string | undefined {
  if (!forwardedFor)
    return undefined
  const [first] = forwardedFor.split(',')
  const address = first?.trim()
  return address || undefined
}

function socketAddress(c: Context): string | undefined {
  try {
    return getConnInfo(c).remote.address
  }
  catch {
    // app.request() and other non-Node fetches have no socket
  }
}

/** Use X-Forwarded-For only when the deployment trusts a proxy that overwrites it. */
export function resolveClientKey(options: {
  remoteAddress?: string
  forwardedFor?: string | null
  trustProxy?: boolean
}): string {
  if (options.trustProxy) {
    const forwarded = firstForwardedAddress(options.forwardedFor)
    if (forwarded)
      return forwarded
  }

  return options.remoteAddress ?? 'unknown'
}

function clientKey(c: Context): string {
  return resolveClientKey({
    remoteAddress: socketAddress(c),
    forwardedFor: c.req.header('x-forwarded-for'),
    trustProxy: env.TRUST_PROXY,
  })
}

export function skipPublic(c: Context) {
  if (c.req.method === 'OPTIONS')
    return true
  const path = c.req.path
  return path === '/' || path === '/health'
}

let rateLimitStoreFactory: (prefix: string) => Store = prefix => createRedisStore(prefix)

/** Tests inject MemoryStore. Production keeps the Redis factory. */
export function setRateLimitStoreFactory(factory: (prefix: string) => Store) {
  rateLimitStoreFactory = factory
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

function createStore(prefix: string): Store {
  let inner: Store | undefined
  let initOptions: Parameters<RedisStore['init']>[0] | undefined

  function store() {
    if (!inner) {
      inner = rateLimitStoreFactory(prefix)
      if (initOptions)
        inner.init?.(initOptions)
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
    get: key => store().get?.(key),
  }
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
