// Test-database URL rules shared by the `db:test:*` scripts and the Vitest
// setup guard. Tests and test scripts must only ever reach a database whose
// name ends in `_test`, so a stray environment cannot point them at the
// development database.

export const defaultTestDatabaseUrl
  = 'postgres://nuxt_app_user:nuxt_app_password@localhost:55432/nuxt_app_test'

export function databaseNameFromUrl(url: string): string | null {
  try {
    const name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''))
    return name || null
  }
  catch {
    return null
  }
}

export function assertTestDatabaseUrl(url: string, label = 'TEST_DATABASE_URL'): string {
  const name = databaseNameFromUrl(url)

  if (!name) {
    throw new Error(`${label} is not a valid PostgreSQL URL: ${url || '(empty)'}`)
  }

  if (!name.toLowerCase().endsWith('_test')) {
    throw new Error(
      `${label} must name a test database ending in "_test", got "${name}". Refusing to touch it.`,
    )
  }

  return name
}
