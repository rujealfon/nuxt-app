import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DomainFailure } from '../utils/domain-failure'

const mocks = vi.hoisted(() => ({
  consume: vi.fn(),
  setHeader: vi.fn(),
  getRequestIP: vi.fn(() => '203.0.113.7'),
  state: { rateLimitEnabled: true },
}))

vi.mock('h3', () => ({
  defineEventHandler: (handler: unknown) => handler,
  getRequestIP: mocks.getRequestIP,
  setHeader: mocks.setHeader,
}))

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => ({ rateLimitEnabled: mocks.state.rateLimitEnabled }),
}))

vi.mock('../utils/rate-limit', () => ({
  createRateLimitStorage: () => ({ consume: mocks.consume }),
}))

const handler = (await import('./rate-limit')).default as (event: unknown) => Promise<unknown>

const { consume, setHeader } = mocks

function event(path: string, method = 'GET') {
  return { path, method, context: {} }
}

describe('rate-limit middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VERCEL', '')
    mocks.state.rateLimitEnabled = true
    consume.mockResolvedValue({ allowed: true, retryAfter: null })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does nothing when rate limiting is disabled', async () => {
    mocks.state.rateLimitEnabled = false

    await expect(handler(event('/api/v1/hello'))).resolves.toBeUndefined()
    expect(consume).not.toHaveBeenCalled()
  })

  it.each([
    '/',
    '/api/auth/sign-in',
    '/api/health',
    '/api/health/ready',
    '/api/docs',
    '/api/docs-assets/standalone.js',
  ])('exempts %s from rate limiting', async (path) => {
    await expect(handler(event(path))).resolves.toBeUndefined()
    expect(consume).not.toHaveBeenCalled()
  })

  it('allows a request under the limit without touching the response', async () => {
    await expect(handler(event('/api/v1/hello'))).resolves.toBeUndefined()
    expect(setHeader).not.toHaveBeenCalled()
  })

  it('preserves the known operation bucket without the query string', async () => {
    await handler(event('/api/v1/hello?foo=bar'))

    expect(consume).toHaveBeenCalledWith('203.0.113.7:GET:/api/v1/hello', { window: 60, max: 100 })
  })

  it('shares the known operation bucket with its trailing-slash alias', async () => {
    await handler(event('/api/v1/hello'))
    await handler(event('/api/v1/hello/?foo=bar'))

    expect(consume.mock.calls.map(([key]) => key)).toEqual([
      '203.0.113.7:GET:/api/v1/hello',
      '203.0.113.7:GET:/api/v1/hello',
    ])
  })

  it('shares one bucket across arbitrary paths and methods', async () => {
    await handler(event('/api/random/one'))
    await handler(event('/api/random/two?foo=bar'))
    await handler(event('/api/v9/hello'))
    await handler(event('/api/v1/hello', 'TRACE'))

    expect(consume.mock.calls.map(([key]) => key)).toEqual([
      '203.0.113.7:unknown',
      '203.0.113.7:unknown',
      '203.0.113.7:unknown',
      '203.0.113.7:unknown',
    ])
  })

  it.each(['/api/authentic/sign-in', '/api/healthful'])('does not exempt lookalike path %s', async (path) => {
    await handler(event(path))

    expect(consume).toHaveBeenCalledWith('203.0.113.7:unknown', { window: 60, max: 100 })
  })

  it('uses forwarding headers only on Vercel', async () => {
    await handler(event('/api/v1/hello'))
    expect(mocks.getRequestIP).toHaveBeenLastCalledWith(expect.anything(), { xForwardedFor: false })

    vi.stubEnv('VERCEL', '1')
    await handler(event('/api/v1/hello'))
    expect(mocks.getRequestIP).toHaveBeenLastCalledWith(expect.anything(), { xForwardedFor: true })
  })

  it('denies over-limit requests with retry headers and a rate_limited failure', async () => {
    consume.mockResolvedValue({ allowed: false, retryAfter: 13 })

    const caught = await handler(event('/api/v1/hello')).then(
      () => {
        throw new Error('expected the handler to throw')
      },
      (error: unknown) => error,
    )

    expect(caught).toBeInstanceOf(DomainFailure)
    expect((caught as DomainFailure).error).toBe('rate_limited')
    expect(setHeader).toHaveBeenCalledWith(expect.anything(), 'x-retry-after', '13')
    expect(setHeader).toHaveBeenCalledWith(expect.anything(), 'retry-after', 13)
  })

  it('falls back to an unknown ip when none is available', async () => {
    mocks.getRequestIP.mockReturnValueOnce(undefined as unknown as string)

    await handler(event('/api/v1/hello'))

    expect(consume).toHaveBeenCalledWith('unknown:GET:/api/v1/hello', { window: 60, max: 100 })
  })

  it('defaults a missing retry-after to zero', async () => {
    consume.mockResolvedValue({ allowed: false, retryAfter: null })

    await handler(event('/api/v1/hello')).catch(() => {})

    expect(setHeader).toHaveBeenCalledWith(expect.anything(), 'retry-after', 0)
  })
})
