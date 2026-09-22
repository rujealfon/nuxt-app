import { beforeEach, describe, expect, it, vi } from 'vitest'

// The Nitro-facing wrapper (`db.ts`). The framework-free construction it defers
// to is covered in `db-core.spec.ts`; here we mock it to test the lazy handle.
const mocks = vi.hoisted(() => {
  const db = { tag: 'db' }
  const withTransaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(db))

  return {
    db,
    withTransaction,
    createDb: vi.fn((_config: unknown) => ({ db, withTransaction })),
    parseDriver: vi.fn((value: unknown) => (value === 'pg' || value === 'neon' ? value : undefined)),
    state: {
      databaseUrl: 'postgres://user:pass@localhost:5432/db',
      databaseDriver: 'pg' as string,
    },
  }
})

vi.mock('nitropack/runtime', () => ({ useRuntimeConfig: () => mocks.state }))
vi.mock('./db-core', () => ({ createDb: mocks.createDb, parseDriver: mocks.parseDriver }))

let mod: typeof import('./db')

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  mocks.state.databaseDriver = 'pg'
  mod = await import('./db')
})

describe('useDb', () => {
  it('builds the handle from runtime config and caches it', () => {
    expect(mod.useDb()).toBe(mocks.db)
    expect(mocks.createDb).toHaveBeenCalledTimes(1)
    expect(mocks.createDb).toHaveBeenCalledWith({ url: mocks.state.databaseUrl, driver: 'pg' })

    mod.useDb()
    expect(mocks.createDb).toHaveBeenCalledTimes(1)
  })

  it('defers to host detection when no driver is configured', () => {
    mocks.state.databaseDriver = ''

    mod.useDb()

    expect(mocks.createDb).toHaveBeenCalledWith({ url: mocks.state.databaseUrl, driver: undefined })
  })
})

describe('withTransaction', () => {
  it('delegates to the cached handle', async () => {
    const fn = vi.fn(async () => 'ok')

    await expect(mod.withTransaction(fn)).resolves.toBe('ok')
    expect(mocks.withTransaction).toHaveBeenCalledWith(fn)
  })
})
