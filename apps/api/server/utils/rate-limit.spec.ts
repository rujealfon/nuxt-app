import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const evalMock = vi.fn()
  const loggerError = vi.fn()
  return {
    evalMock,
    loggerError,
    useRedis: vi.fn(() => ({ eval: evalMock })),
    useLogger: vi.fn(() => ({ error: loggerError })),
  }
})

vi.mock('./redis', () => ({ useRedis: mocks.useRedis }))
vi.mock('./logger', () => ({ useLogger: mocks.useLogger }))

const { createRateLimitStorage, rateLimitPolicy } = await import('./rate-limit')

const { evalMock, loggerError } = mocks

describe('createRateLimitStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shares one default policy', () => {
    expect(rateLimitPolicy).toEqual({ window: 60, max: 100 })
  })

  it('allows requests under the maximum', async () => {
    evalMock.mockResolvedValue([42, 30_000])
    const storage = createRateLimitStorage()

    const result = await storage.consume('ip:GET:/api/v1/x', { window: 60, max: 100 })

    expect(result).toEqual({ allowed: true, retryAfter: null })
    expect(evalMock).toHaveBeenCalledWith(
      expect.stringContaining('redis.call'),
      1,
      'rate-limit:ip:GET:/api/v1/x',
      60_000,
    )
  })

  it('denies requests over the maximum with a retry delay', async () => {
    evalMock.mockResolvedValue([101, 12_300])
    const storage = createRateLimitStorage()

    const result = await storage.consume('k', { window: 60, max: 100 })

    expect(result).toEqual({ allowed: false, retryAfter: 13 })
  })

  it('fails open and logs when Redis is unreachable', async () => {
    evalMock.mockRejectedValue(new Error('ECONNREFUSED'))
    const storage = createRateLimitStorage()

    const result = await storage.consume('k', { window: 60, max: 100 })

    expect(result).toEqual({ allowed: true, retryAfter: null })
    expect(loggerError).toHaveBeenCalled()
  })

  it('fails closed when the storage opts in, so auth throttling survives an outage', async () => {
    evalMock.mockRejectedValue(new Error('ECONNREFUSED'))
    const storage = createRateLimitStorage({ failClosed: true })

    const result = await storage.consume('k', { window: 60, max: 100 })

    expect(result).toEqual({ allowed: false, retryAfter: 60 })
    expect(loggerError).toHaveBeenCalled()
  })
})
