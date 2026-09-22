import { describe, expect, it, vi } from 'vitest'

const pg = vi.hoisted(() => {
  const transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn({ tx: true }))
  const db = { transaction }

  return {
    db,
    transaction,
    Pool: vi.fn(class {
      end = vi.fn()
    }),
    drizzle: vi.fn(() => db),
  }
})

vi.mock('pg', () => ({ Pool: pg.Pool }))
vi.mock('drizzle-orm/node-postgres', () => ({ drizzle: pg.drizzle }))

const { createDb, parseDriver, selectDriver } = await import('./db-core')

const pgUrl = 'postgres://user:pass@localhost:5432/db'
const neonUrl = 'postgres://user:pass@ep-foo-123456.us-east-2.aws.neon.tech/db'

describe('selectDriver', () => {
  it('selects the pg driver for a local postgres url', () => {
    expect(selectDriver({ url: pgUrl })).toBe('pg')
  })

  it('selects the neon driver for a neon host', () => {
    expect(selectDriver({ url: neonUrl })).toBe('neon')
  })

  it('selects the neon driver when configured explicitly', () => {
    expect(selectDriver({ url: pgUrl, driver: 'neon' })).toBe('neon')
  })

  it('honors an explicit pg driver on a neon host', () => {
    expect(selectDriver({ url: neonUrl, driver: 'pg' })).toBe('pg')
  })

  it('does not treat neon.tech in the password as a neon host', () => {
    expect(selectDriver({ url: 'postgres://user:neon.tech@localhost:5432/db' })).toBe('pg')
  })

  it('detects a neon host regardless of case', () => {
    expect(selectDriver({ url: 'postgres://user:pass@EP-FOO.AWS.NEON.TECH/db' })).toBe('neon')
  })

  it('falls back to the pg driver when the url cannot be parsed', () => {
    expect(selectDriver({ url: 'not a url' })).toBe('pg')
  })
})

describe('parseDriver', () => {
  it('accepts known drivers and ignores anything else', () => {
    expect(parseDriver('neon')).toBe('neon')
    expect(parseDriver('pg')).toBe('pg')
    expect(parseDriver('')).toBeUndefined()
    expect(parseDriver(undefined)).toBeUndefined()
    expect(parseDriver('mysql')).toBeUndefined()
  })
})

describe('createDb', () => {
  it('fails transactions loudly on the neon driver', async () => {
    const handle = createDb({ url: neonUrl })

    await expect(handle.withTransaction(async () => 'never')).rejects.toThrow(
      'Transactions are not supported by the neon-http driver',
    )
  })

  it('constructs a pg pool and delegates transactions', async () => {
    const handle = createDb({ url: pgUrl })

    expect(pg.Pool).toHaveBeenCalledWith({
      connectionString: pgUrl,
      max: 10,
      allowExitOnIdle: true,
    })
    expect(pg.drizzle).toHaveBeenCalledTimes(1)
    expect(handle.db).toBe(pg.db)

    await expect(handle.withTransaction(async () => 'ok')).resolves.toBe('ok')
    expect(pg.transaction).toHaveBeenCalledTimes(1)
  })
})
