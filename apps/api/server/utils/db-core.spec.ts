import type { Database, RawDatabase } from './db-core'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

const pg = vi.hoisted(() => {
  const transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn({ tx: true }))
  const db = { transaction }

  return {
    db,
    transaction,
    Pool: vi.fn(class {
      end = vi.fn()
      listeners = new Map<string, (error: Error) => void>()

      on(event: string, listener: (error: Error) => void) {
        this.listeners.set(event, listener)
        return this
      }
    }),
    drizzle: vi.fn(() => db),
  }
})

vi.mock('pg', () => ({ Pool: pg.Pool }))
vi.mock('drizzle-orm/node-postgres', () => ({ drizzle: pg.drizzle }))

const { createDb } = await import('./db-core')

const pgUrl = 'postgres://user:pass@localhost:5432/db'

describe('createDb', () => {
  it('constructs a pg pool and delegates transactions', async () => {
    const handle = createDb({ url: pgUrl })

    expect(pg.Pool).toHaveBeenCalledWith({
      connectionString: pgUrl,
      max: 10,
      allowExitOnIdle: true,
      connectionTimeoutMillis: 10_000,
    })
    expect(pg.drizzle).toHaveBeenCalledTimes(1)
    expect(handle.db).toBe(pg.db)
    expect(handle.rawDb).toBe(pg.db)

    await expect(handle.withTransaction(async () => 'ok')).resolves.toBe('ok')
    expect(pg.transaction).toHaveBeenCalledTimes(1)
  })

  // An unhandled pool 'error' event (an idle client dropped by a Postgres
  // restart) would crash the process.
  function poolOf(): { listeners: Map<string, (error: Error) => void> } {
    return pg.Pool.mock.instances.at(-1) as never
  }

  it('listens for pool errors and reports them to onError', () => {
    const onError = vi.fn()
    const error = new Error('terminating connection due to administrator command')

    createDb({ url: pgUrl, onError })
    const listener = poolOf().listeners.get('error')

    expect(listener).toBeDefined()
    expect(() => listener!(error)).not.toThrow()
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('logs pool errors to the console by default without throwing', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('ECONNRESET')

    createDb({ url: pgUrl })

    expect(() => poolOf().listeners.get('error')!(error)).not.toThrow()
    expect(consoleError).toHaveBeenCalledWith('Idle database client error', error)
    consoleError.mockRestore()
  })
})

// The seam is type-level: `Database` (what `useDb()` and `withTransaction` hand to
// callers) has no `.transaction()`, while `RawDatabase` (Better Auth's adapter,
// `seed.ts`) keeps it. `pnpm type-check` fails if either changes.
describe('database type', () => {
  it('hides transaction from services and keeps it on the raw client', () => {
    expectTypeOf<Database>().not.toHaveProperty('transaction')
    expectTypeOf<RawDatabase>().toHaveProperty('transaction')
    expectTypeOf<RawDatabase>().toExtend<Database>()
  })

  it('types the withTransaction handle without transaction', () => {
    type Tx = Parameters<Parameters<ReturnType<typeof createDb>['withTransaction']>[0]>[0]

    expectTypeOf<Tx>().not.toHaveProperty('transaction')
    expectTypeOf<ReturnType<typeof createDb>['db']>().not.toHaveProperty('transaction')
    expectTypeOf<ReturnType<typeof createDb>['rawDb']>().toHaveProperty('transaction')
  })
})
