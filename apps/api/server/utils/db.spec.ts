import { describe, expect, it } from 'vitest'
import { createDb, selectDriver } from './db'

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
})

describe('createDb', () => {
  it('fails transactions loudly on the neon driver', async () => {
    const handle = createDb({ url: neonUrl })

    await expect(handle.withTransaction(async () => 'never')).rejects.toThrow(
      'Transactions are not supported by the neon-http driver',
    )
  })
})
