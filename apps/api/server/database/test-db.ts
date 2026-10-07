import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Client, escapeIdentifier } from 'pg'
import { assertTestDatabaseUrl, defaultTestDatabaseUrl } from './test-database-url'

// Lifecycle commands for the test database (nuxt_app_test). Every command
// refuses any TEST_DATABASE_URL whose database name does not end in `_test`,
// so these scripts can never reach the development database.
//
// Usage (from the repository root):
//   pnpm db:test:create|reset|migrate|push|seed

try {
  process.loadEnvFile()
}
catch {
  // .env is optional; fall back to the process environment.
}

const apiRoot = fileURLToPath(new URL('../..', import.meta.url))
const targetUrl = process.env.TEST_DATABASE_URL || defaultTestDatabaseUrl
const databaseName = assertTestDatabaseUrl(targetUrl)
const command = process.argv[2]

function adminClient(): Client {
  const adminUrl = new URL(targetUrl)
  adminUrl.pathname = '/postgres'
  return new Client({ connectionString: adminUrl.toString() })
}

async function withAdmin<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = adminClient()

  try {
    await client.connect()
  }
  catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`Could not reach Postgres to manage "${databaseName}". Is it running? Start it with "pnpm db:up".\n${detail}`)
  }

  try {
    return await fn(client)
  }
  finally {
    await client.end()
  }
}

async function createDatabase(): Promise<void> {
  await withAdmin(async (client) => {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName])

    if (existing.rowCount === 1) {
      console.log(`Test database already exists: ${databaseName}`)
      return
    }

    await client.query(`CREATE DATABASE ${escapeIdentifier(databaseName)}`)
    console.log(`Created test database: ${databaseName}`)
  })
}

async function resetDatabase(): Promise<void> {
  await withAdmin(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS ${escapeIdentifier(databaseName)} WITH (FORCE)`)
    await client.query(`CREATE DATABASE ${escapeIdentifier(databaseName)}`)
    console.log(`Reset test database: ${databaseName}`)
  })
}

function run(tool: string, args: string[]): void {
  const result = spawnSync('pnpm', ['exec', tool, ...args], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: targetUrl },
    stdio: 'inherit',
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

async function main(): Promise<void> {
  switch (command) {
    case 'create':
      await createDatabase()
      break
    case 'reset':
      await resetDatabase()
      break
    case 'migrate':
      await createDatabase()
      run('drizzle-kit', ['migrate'])
      break
    case 'push':
      await createDatabase()
      run('drizzle-kit', ['push', '--force'])
      break
    case 'seed':
      await createDatabase()
      run('tsx', ['server/database/seed.ts'])
      break
    default:
      console.error('Usage: pnpm db:test:<create|reset|migrate|push|seed>')
      process.exit(1)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
