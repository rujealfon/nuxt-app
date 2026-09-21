import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
}))

vi.mock('nitropack/runtime', () => ({
  defineNitroPlugin: (plugin: unknown) => plugin,
  useRuntimeConfig: () => mocks.state,
}))

const validateEnvModule = await import('./validate-env')
const plugin = validateEnvModule.default as unknown as () => void
const { compiledEnvSchema, envSchema } = validateEnvModule

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

// `z.compile(..., { strict: true })` throws when it cannot compile a schema, so
// the import above succeeding already proves this one compiled. These tests
// check that the compiled schema accepts and rejects exactly what `envSchema`
// does, including the issues.
type ParseResult = ReturnType<typeof envSchema.safeParse>

function summarize(result: ParseResult) {
  return result.success
    ? { success: true as const, data: result.data }
    : {
        success: false as const,
        issues: result.error.issues.map(issue => ({
          code: issue.code,
          path: issue.path,
          message: issue.message,
        })),
      }
}

describe('compiled env schema', () => {
  it('returns a compiled copy, not the original schema', () => {
    expect(compiledEnvSchema).not.toBe(envSchema)
  })

  it.each([
    ['a valid configuration', valid],
    ['omitted optional fields, applying defaults', {
      databaseUrl: valid.databaseUrl,
      betterAuthSecret: valid.betterAuthSecret,
      betterAuthUrl: valid.betterAuthUrl,
      redisUrl: valid.redisUrl,
    }],
    ['an empty required field', { ...valid, databaseUrl: '' }],
    ['a malformed URL', { ...valid, betterAuthUrl: 'not-a-url' }],
    ['an unknown enum member', { ...valid, databaseDriver: 'mysql' }],
    ['several failures at once', { ...valid, databaseUrl: '', redisUrl: '', betterAuthUrl: 'nope' }],
  ])('matches the runtime parser on %s', (_label, input) => {
    expect(summarize(compiledEnvSchema.safeParse(input))).toEqual(summarize(envSchema.safeParse(input)))
  })

  it('checks validity with .validate()', () => {
    expect(compiledEnvSchema.validate(valid)).toBe(true)
    expect(compiledEnvSchema.validate({ ...valid, redisUrl: '' })).toBe(false)
  })
})
