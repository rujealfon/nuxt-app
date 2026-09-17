import { describe, expect, it } from 'vitest'
import { createDb } from './db'

const pgUrl = 'postgres://user:pass@localhost:5432/db'
const neonUrl = 'postgres://user:pass@ep-foo-123456.us-east-2.aws.neon.tech/db'

describe('createDb', () => {
  it('selects the pg driver for a local postgres url', () => {
    expect(createDb({ url: pgUrl }).canTransact).toBe(true)
  })

  it('selects the neon driver for a neon host', () => {
    expect(createDb({ url: neonUrl }).canTransact).toBe(false)
  })

  it('selects the neon driver when configured explicitly', () => {
    expect(createDb({ url: pgUrl, driver: 'neon' }).canTransact).toBe(false)
  })

  it('fails transactions loudly on the neon driver', async () => {
    const handle = createDb({ url: neonUrl })

    await expect(handle.withTransaction(async () => 'never')).rejects.toThrow(
      'Transactions are not supported by the neon-http driver',
    )
  })
})
