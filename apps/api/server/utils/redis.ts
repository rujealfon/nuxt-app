import Redis from 'ioredis'
import { useRuntimeConfig } from 'nitropack/runtime'

let client: Redis | undefined

export function useRedis() {
  const config = useRuntimeConfig()
  client ??= new Redis(config.redisUrl, {
    // Fail fast instead of buffering commands when the connection drops.
    maxRetriesPerRequest: 2,
    connectTimeout: 10_000,
  })
  return client
}
