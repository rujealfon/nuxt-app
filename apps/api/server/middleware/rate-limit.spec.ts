import { beforeEach, describe, expect, it, vi } from 'vitest'
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

function event(path: string) {
  return { path, method: 'GET', context: {} }
}

describe('rate-limit middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.state.rateLimitEnabled = true
    consume.mockResolvedValue({ allowed: true, retryAfter: null })
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

  it('keys the counter by ip, method, and path without the query string', async () => {
    await handler(event('/api/v1/hello?foo=bar'))

    expect(consume).toHaveBeenCalledWith('203.0.113.7:GET:/api/v1/hello', { window: 60, max: 100 })
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
