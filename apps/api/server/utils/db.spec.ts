import { beforeEach, describe, expect, it, vi } from 'vitest'

// The Nitro-facing wrapper (`db.ts`). The framework-free construction it defers
// to is covered in `db-core.spec.ts`; here we mock it to test the lazy handle.
const mocks = vi.hoisted(() => {
  const db = { tag: 'db' }
  const rawDb = { tag: 'raw' }
  const withTransaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(db))

  return {
    db,
    rawDb,
    withTransaction,
    logError: vi.fn(),
    createDb: vi.fn((_config: unknown) => ({ db, rawDb, withTransaction })),
    state: {
      databaseUrl: 'postgres://user:pass@localhost:5432/db',
    },
  }
})

vi.mock('nitropack/runtime', () => ({ useRuntimeConfig: () => mocks.state }))
vi.mock('./db-core', () => ({ createDb: mocks.createDb }))
vi.mock('./logger', () => ({ useLogger: () => ({ error: mocks.logError }) }))

let mod: typeof import('./db')

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  mod = await import('./db')
})

describe('useDb', () => {
  it('builds the handle from runtime config and caches it', () => {
    expect(mod.useDb()).toBe(mocks.db)
    expect(mocks.createDb).toHaveBeenCalledTimes(1)
    expect(mocks.createDb).toHaveBeenCalledWith({
      url: mocks.state.databaseUrl,
      onError: expect.any(Function),
    })

    mod.useDb()
    expect(mocks.createDb).toHaveBeenCalledTimes(1)
  })

  it('logs idle pool client errors through the API logger', () => {
    mod.useDb()
    const { onError } = mocks.createDb.mock.calls[0]![0] as { onError: (error: Error) => void }
    const error = new Error('terminating connection')

    onError(error)

    expect(mocks.logError).toHaveBeenCalledWith(
      { err: error },
      'idle database client error',
    )
  })
})

describe('useRawDb', () => {
  it('returns the raw client from the same cached handle', () => {
    expect(mod.useRawDb()).toBe(mocks.rawDb)
    expect(mod.useDb()).toBe(mocks.db)
    expect(mocks.createDb).toHaveBeenCalledTimes(1)
  })
})

describe('withTransaction', () => {
  it('delegates to the cached handle', async () => {
    const fn = vi.fn(async () => 'ok')

    await expect(mod.withTransaction(fn)).resolves.toBe('ok')
    expect(mocks.withTransaction).toHaveBeenCalledWith(fn)
  })
})
