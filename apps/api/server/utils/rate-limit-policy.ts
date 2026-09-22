// Rate-limit policy constants and the storage contract, kept free of
// `nitropack/runtime` (unlike `rate-limit.ts`, which pulls in Redis). The
// Better Auth instance in `database/auth.ts` needs only these, and that module
// is loaded by CLI scripts that run outside Nitro.

export interface RateLimitStorage {
  consume: (
    key: string,
    rule: { window: number, max: number },
  ) => Promise<{ allowed: boolean, retryAfter: number | null }>
}

// Shared default policy: the Nitro middleware and Better Auth read the same
// window and maximum from here instead of restating them.
export const rateLimitPolicy = { window: 60, max: 100 } as const

export interface RateLimitStorageOptions {
  // When true, a store outage denies the request instead of allowing it.
  // Better Auth's per-endpoint brute-force limiter opts in so a Redis outage
  // cannot silently disable auth throttling.
  failClosed?: boolean
}
