import { describe, expect, it } from 'vitest'
import {
  assertTestDatabaseUrl,
  databaseNameFromUrl,
  defaultTestDatabaseUrl,
} from './test-database-url'

describe('databaseNameFromUrl', () => {
  it('reads the database name from a postgres URL', () => {
    expect(databaseNameFromUrl('postgres://user:pass@localhost:55432/nuxt_app_test')).toBe('nuxt_app_test')
  })

  it('ignores query parameters and the postgresql scheme', () => {
    expect(databaseNameFromUrl('postgresql://user:pass@host:5432/db_test?sslmode=require')).toBe('db_test')
  })

  it('returns null when the URL cannot be parsed', () => {
    expect(databaseNameFromUrl('not a url')).toBeNull()
  })

  it('returns null when no database is named', () => {
    expect(databaseNameFromUrl('postgres://user:pass@localhost:5432')).toBeNull()
    expect(databaseNameFromUrl('postgres://user:pass@localhost:5432/')).toBeNull()
  })

  it('decodes percent-encoded names', () => {
    expect(databaseNameFromUrl('postgres://user:pass@localhost:5432/nuxt%5Fapp_test')).toBe('nuxt_app_test')
  })
})

describe('assertTestDatabaseUrl', () => {
  it('accepts the default test database', () => {
    expect(assertTestDatabaseUrl(defaultTestDatabaseUrl)).toBe('nuxt_app_test')
  })

  it('accepts any name ending in _test, regardless of case', () => {
    expect(assertTestDatabaseUrl('postgres://user:pass@localhost:5432/nuxt_app_TEST')).toBe('nuxt_app_TEST')
  })

  it('rejects the development database', () => {
    expect(() => assertTestDatabaseUrl('postgres://user:pass@localhost:55432/nuxt_app_db'))
      .toThrow(/must name a test database/)
  })

  it('rejects a missing database name', () => {
    expect(() => assertTestDatabaseUrl('postgres://user:pass@localhost:5432'))
      .toThrow(/not a valid PostgreSQL URL/)
  })

  it('rejects unparseable URLs', () => {
    expect(() => assertTestDatabaseUrl('not a url')).toThrow(/not a valid PostgreSQL URL/)
    expect(() => assertTestDatabaseUrl('')).toThrow(/not a valid PostgreSQL URL/)
  })

  it('names the checked variable in the error', () => {
    expect(() => assertTestDatabaseUrl('postgres://user:pass@localhost:5432/nuxt_app_db', 'DATABASE_URL'))
      .toThrow(/^DATABASE_URL /)
  })
})
