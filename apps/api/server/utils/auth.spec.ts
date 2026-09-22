import { siteUrls } from '@nuxt-app/config'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const auth = { handler: vi.fn() }
  const storage = { consume: vi.fn() }

  return {
    auth,
    storage,
    createAuth: vi.fn((_db: unknown, _config: unknown) => auth),
    useDb: vi.fn(() => ({ tag: 'db' })),
    createRateLimitStorage: vi.fn((_options: unknown) => storage),
    state: {
      betterAuthSecret: 'secret-secret-secret-secret-secret',
      betterAuthUrl: 'http://localhost:3003',
      corsOrigins: 'https://app.example.com, https://admin.example.com',
      authBearerEnabled: true,
    },
  }
})

vi.mock('nitropack/runtime', () => ({ useRuntimeConfig: () => mocks.state }))
vi.mock('../database/auth', () => ({ createAuth: mocks.createAuth }))
vi.mock('./db', () => ({ useDb: mocks.useDb }))
vi.mock('./rate-limit', () => ({ createRateLimitStorage: mocks.createRateLimitStorage }))

let mod: typeof import('./auth')

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  mocks.state.corsOrigins = 'https://app.example.com, https://admin.example.com'
  mocks.state.authBearerEnabled = true
  mod = await import('./auth')
})

describe('useAuth', () => {
  it('builds the instance from runtime config and caches it', () => {
    expect(mod.useAuth()).toBe(mocks.auth)
    expect(mocks.createAuth).toHaveBeenCalledTimes(1)

    const [db, config] = mocks.createAuth.mock.calls[0]!

    expect(db).toBe(mocks.useDb.mock.results[0]!.value)
    expect(config).toMatchObject({
      secret: mocks.state.betterAuthSecret,
      baseURL: mocks.state.betterAuthUrl,
      trustedOrigins: ['https://app.example.com', 'https://admin.example.com'],
      bearerEnabled: true,
      rateLimitStorage: mocks.storage,
    })
    expect(mocks.createRateLimitStorage).toHaveBeenCalledWith({ failClosed: true })

    mod.useAuth()
    expect(mocks.createAuth).toHaveBeenCalledTimes(1)
  })

  it('falls back to the local site table when no origins are configured', () => {
    mocks.state.corsOrigins = ''

    mod.useAuth()

    expect(mocks.createAuth.mock.calls[0]![1]).toMatchObject({
      trustedOrigins: Object.values(siteUrls),
    })
  })
})
