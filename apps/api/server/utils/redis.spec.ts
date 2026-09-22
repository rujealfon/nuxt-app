import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  Redis: vi.fn(),
  state: { redisUrl: 'redis://localhost:6379' },
}))

vi.mock('ioredis', () => ({ default: mocks.Redis }))
vi.mock('nitropack/runtime', () => ({ useRuntimeConfig: () => mocks.state }))

let mod: typeof import('./redis')

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  mod = await import('./redis')
})

describe('useRedis', () => {
  it('creates the client from runtime config and caches it', () => {
    const client = mod.useRedis()

    expect(mocks.Redis).toHaveBeenCalledTimes(1)
    expect(mocks.Redis).toHaveBeenCalledWith(mocks.state.redisUrl, {
      maxRetriesPerRequest: 2,
      connectTimeout: 10_000,
    })

    expect(mod.useRedis()).toBe(client)
    expect(mocks.Redis).toHaveBeenCalledTimes(1)
  })
})
