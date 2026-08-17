import process from 'node:process'
import { loadEnv } from '@api/load-env.js'

export const TEST_DATABASE_NAME = 'nuxt_app_test'

export function replaceDatabaseName(connectionString: string, name: string) {
  const url = new URL(connectionString)
  url.pathname = `/${name}`
  return url.toString()
}

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  loadEnv()

  if (env.NODE_ENV === 'test') {
    if (env.DATABASE_URL_TEST)
      return env.DATABASE_URL_TEST
    if (env.DATABASE_URL)
      return replaceDatabaseName(env.DATABASE_URL, TEST_DATABASE_NAME)
    throw new Error('DATABASE_URL or DATABASE_URL_TEST is required')
  }

  if (!env.DATABASE_URL)
    throw new Error('DATABASE_URL is required')

  return env.DATABASE_URL
}
