import type { RedisClient } from 'hono-rate-limiter'
import { createClient } from 'redis'
import { env } from '#api/env.js'

export const redis = createClient({ url: env.REDIS_URL })

redis.on('error', (err) => {
  console.error('Redis error:', err)
})

let connecting: Promise<void> | undefined

export async function connectRedis() {
  if (redis.isOpen)
    return
  connecting ??= redis.connect().then(
    () => {
      connecting = undefined
    },
    (err) => {
      connecting = undefined
      throw err
    },
  )
  await connecting
}

/** hono-rate-limiter RedisStore expects Upstash-shaped method names. */
export const rateLimitRedis: RedisClient = {
  async scriptLoad(script) {
    await connectRedis()
    return redis.scriptLoad(script)
  },
  async evalsha(sha, keys, args) {
    await connectRedis()
    return redis.evalSha(sha, { keys, arguments: args.map(String) }) as Promise<never>
  },
  async decr(key) {
    await connectRedis()
    return redis.decr(key)
  },
  async del(key) {
    await connectRedis()
    return redis.del(key)
  },
}
