import type { RedisOptions } from 'ioredis'
import Redis from 'ioredis'
import { useRuntimeConfig } from 'nitropack/runtime'

// Fail fast instead of buffering commands when the connection drops.
// The default reply mapping keeps ping() and Lua arrays in legacy shapes.
export const redisClientOptions = {
  maxRetriesPerRequest: 2,
  connectTimeout: 10_000,
} satisfies RedisOptions

let client: Redis | undefined

export function useRedis() {
  const config = useRuntimeConfig()
  client ??= new Redis(config.redisUrl, redisClientOptions)
  return client
}
