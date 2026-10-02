import { describe, expect, it, vi } from 'vitest'
import { boundedAuthRateLimitStorage } from './auth-rate-limit-policy'

describe('auth rate-limit identity validation', () => {
  it.each(['', '/sign-in/email', '|/sign-in/email'])(
    'denies malformed key %j without accessing storage',
    async (key) => {
      const consume = vi.fn()
      const storage = boundedAuthRateLimitStorage({ consume }, ['/sign-in/email'])

      await expect(storage.consume(key, { window: 10, max: 3 })).resolves.toEqual({
        allowed: false,
        retryAfter: 60,
      })
      expect(consume).not.toHaveBeenCalled()
    },
  )
})
