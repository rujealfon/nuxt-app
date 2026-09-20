import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
}))

vi.mock('nitropack/runtime', () => ({
  defineNitroPlugin: (plugin: unknown) => plugin,
  useRuntimeConfig: () => mocks.state,
}))

const plugin = (await import('./validate-env')).default as () => void

const valid = {
  databaseUrl: 'postgres://user:pass@localhost:5432/db',
  databaseDriver: '',
  betterAuthSecret: 'a'.repeat(32),
  betterAuthUrl: 'http://localhost:3003',
  redisUrl: 'redis://localhost:6379',
  corsOrigins: '',
}

describe('validate-env plugin', () => {
  beforeEach(() => {
    for (const key of Object.keys(mocks.state)) {
      delete mocks.state[key]
    }
    Object.assign(mocks.state, valid)
  })

  it('accepts a valid configuration', () => {
    expect(() => plugin()).not.toThrow()
  })

  it.each([
    ['databaseUrl', { databaseUrl: '' }],
    ['redisUrl', { redisUrl: '' }],
    ['betterAuthSecret', { betterAuthSecret: 'too-short' }],
    ['betterAuthUrl', { betterAuthUrl: 'not-a-url' }],
    ['databaseDriver', { databaseDriver: 'mysql' }],
  ])('rejects an invalid %s', (_field, override) => {
    Object.assign(mocks.state, override)

    expect(() => plugin()).toThrowError(/Invalid environment configuration/)
  })

  it('lists each failing field in the error', () => {
    Object.assign(mocks.state, { databaseUrl: '', redisUrl: '' })

    expect(() => plugin()).toThrowError(/databaseUrl: DATABASE_URL is required/)
    expect(() => plugin()).toThrowError(/redisUrl: REDIS_URL is required/)
  })
})
