import { env } from '@api/env.js'

export const TEST_DATABASE_NAME = 'nuxt_app_test'

export function replaceDatabaseName(connectionString: string, name: string) {
  const url = new URL(connectionString)
  url.pathname = `/${name}`
  return url.toString()
}

export function isPooledConnectionString(connectionString: string) {
  let url: URL
  try {
    url = new URL(connectionString)
  }
  catch {
    return false
  }

  if (url.hostname.includes('-pooler'))
    return true
  if (url.port === '6432')
    return true
  if (url.searchParams.get('pgbouncer') === 'true')
    return true
  return false
}

export function resolveDatabaseUrl() {
  if (env.NODE_ENV === 'test') {
    if (env.DATABASE_URL_TEST)
      return env.DATABASE_URL_TEST
    return replaceDatabaseName(env.DATABASE_URL, TEST_DATABASE_NAME)
  }

  return env.DATABASE_URL
}

export function resolveMigrationDatabaseUrl(settings: {
  nodeEnv: string
  databaseUrl: string
  databaseUrlTest?: string
  databaseUrlUnpooled?: string
} = {
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  databaseUrlTest: env.DATABASE_URL_TEST,
  databaseUrlUnpooled: env.DATABASE_URL_UNPOOLED,
}) {
  if (settings.nodeEnv === 'test') {
    if (settings.databaseUrlTest)
      return settings.databaseUrlTest
    return replaceDatabaseName(settings.databaseUrl, TEST_DATABASE_NAME)
  }

  if (settings.databaseUrlUnpooled)
    return settings.databaseUrlUnpooled

  if (settings.nodeEnv === 'production' && isPooledConnectionString(settings.databaseUrl)) {
    throw new Error(
      'DATABASE_URL_UNPOOLED is required in production when DATABASE_URL is a pooled (PgBouncer) endpoint, e.g. Neon. Use the direct (non-pooler) connection string for migrations.',
    )
  }

  return settings.databaseUrl
}
