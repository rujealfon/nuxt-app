import type { RedisClient } from 'hono-rate-limiter'
import { env } from '@api/env.js'
import { createClient } from 'redis'

export const redis = createClient({ url: env.REDIS_URL })

redis.on('error', (err) => {
  console.error('Redis error:', err)
})

export async function connectRedis() {
  if (!redis.isOpen)
    await redis.connect()
}

/** hono-rate-limiter RedisStore expects Upstash-shaped method names. */
export const rateLimitRedis: RedisClient = {
  scriptLoad: script => redis.scriptLoad(script),
  evalsha: (sha, keys, args) =>
    redis.evalSha(sha, { keys, arguments: args.map(String) }) as Promise<never>,
  decr: key => redis.decr(key),
  del: key => redis.del(key),
}
