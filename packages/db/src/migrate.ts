/* eslint-disable no-console */
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db, pool } from './client'

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '../drizzle')

export async function runMigrations() {
  console.log('Running migrations...')
  await migrate(db, { migrationsFolder })
  console.log('Migrations completed.')
}

const invokedDirectly = process.argv[1]?.includes('migrate')
if (invokedDirectly) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
