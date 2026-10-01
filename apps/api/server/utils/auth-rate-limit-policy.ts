import type { RateLimitStorage } from './rate-limit-policy'
import { rateLimitPolicy } from './rate-limit-policy'

// Better Auth limits before route matching and supplies an IP|path key. Keep
// arbitrary URLs and dynamic parameter values out of the Redis key namespace.
// Paths come from the instance's endpoint metadata, not from request input.
export function boundedAuthRateLimitStorage(
  storage: RateLimitStorage,
  endpointPaths: readonly string[],
): RateLimitStorage {
  return {
    async consume(key, rule) {
      const separator = key.indexOf('|')
      if (separator < 1) {
        return { allowed: false, retryAfter: rateLimitPolicy.window }
      }

      const ip = key.slice(0, separator)
      const segments = key.slice(separator + 1).split('/')
      const endpointPath = endpointPaths.find((path) => {
        const template = path.split('/')
        return template.length === segments.length && template.every((segment, index) =>
          segment.startsWith(':') ? Boolean(segments[index]) : segment === segments[index],
        )
      })

      // Unknown special-prefix paths must share the same window and maximum,
      // so their arrival order cannot shorten the expiry of this shared key.
      return storage.consume(
        `${ip}|${endpointPath ?? 'unknown'}`,
        endpointPath ? rule : rateLimitPolicy,
      )
    },
  }
}
