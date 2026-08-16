import process from 'node:process'
import { resolveDatabaseUrl } from '@nuxt-app/db/url'
import { afterAll, beforeAll } from 'vitest'

process.env.NODE_ENV = 'test'

const url = resolveDatabaseUrl()

beforeAll(async () => {
  const { ensureDatabase, runMigrations } = await import('@nuxt-app/db')
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
  const { pool } = await import('@nuxt-app/db')
  await pool.end()
})
