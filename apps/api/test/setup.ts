import process from 'node:process'
import { MemoryStore } from 'hono-rate-limiter'
import { afterAll, beforeAll } from 'vitest'
import { resolveDatabaseUrl } from '#api/db/url.js'
import { setRateLimitStoreFactory } from '#api/middleware/rate-limit.js'

process.env.NODE_ENV = 'test'
setRateLimitStoreFactory(() => new MemoryStore())

const url = resolveDatabaseUrl()

beforeAll(async () => {
  const { ensureDatabase, runMigrations } = await import('#api/db/index.js')
  try {
    await ensureDatabase(url)
    await runMigrations()
  }
  catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Could not prepare test database (${url}). Start Postgres with \`docker compose up postgres -d\`. ${reason}`,
      { cause: error },
    )
  }
})

afterAll(async () => {
  const { pool } = await import('#api/db/index.js')
  await pool.end()
})
