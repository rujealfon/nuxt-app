/* eslint-disable no-console */
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { resolveMigrationDatabaseUrl } from '#api/db/url.js'

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

export async function runMigrations() {
  const pool = new Pool({
    connectionString: resolveMigrationDatabaseUrl(),
    max: 1,
  })
  const db = drizzle({ client: pool })

  try {
    console.log('Running migrations...')
    await migrate(db, { migrationsFolder })
    console.log('Migrations completed.')
  }
  finally {
    await pool.end()
  }
}

const invokedDirectly = process.argv[1]?.includes('migrate')
if (invokedDirectly) {
  runMigrations()
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
