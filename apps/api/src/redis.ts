import { env } from '@api/env.js'
import { Redis } from '@upstash/redis'

/** HTTP client. Local Compose uses SRH in front of Redis; production uses Upstash. */
export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
})
