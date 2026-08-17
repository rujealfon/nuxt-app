import { env } from '@api/env.js'

export const TEST_DATABASE_NAME = 'nuxt_app_test'

export function replaceDatabaseName(connectionString: string, name: string) {
  const url = new URL(connectionString)
  url.pathname = `/${name}`
  return url.toString()
}

export function resolveDatabaseUrl() {
  if (env.NODE_ENV === 'test') {
    if (env.DATABASE_URL_TEST)
      return env.DATABASE_URL_TEST
    return replaceDatabaseName(env.DATABASE_URL, TEST_DATABASE_NAME)
  }

  return env.DATABASE_URL
}
