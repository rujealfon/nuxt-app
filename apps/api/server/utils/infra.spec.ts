import { describe, expect, it } from 'vitest'
import { healthResponseSchema, readyResponseSchema, versionRegistrySchema } from './infra'

describe('infra response schemas', () => {
  it('accepts a liveness body', () => {
    expect(healthResponseSchema.parse({
      status: 'ok',
      service: 'api.nuxt-app.com',
      timestamp: '2026-01-01T00:00:00.000Z',
    })).toMatchObject({ status: 'ok' })
  })

  it('rejects a liveness status other than ok', () => {
    expect(healthResponseSchema.safeParse({
      status: 'down',
      service: 'api.nuxt-app.com',
      timestamp: '2026-01-01T00:00:00.000Z',
    }).success).toBe(false)
  })

  it('accepts a readiness body', () => {
    expect(readyResponseSchema.parse({ database: true, redis: false })).toEqual({
      database: true,
      redis: false,
    })
  })

  it('accepts the version registry', () => {
    expect(versionRegistrySchema.parse({
      current: 'v1',
      versions: [{ version: 'v1', deprecated: false }],
    })).toEqual({
      current: 'v1',
      versions: [{ version: 'v1', deprecated: false }],
    })
  })

  it('rejects an unregistered version', () => {
    expect(versionRegistrySchema.safeParse({
      current: 'v9',
      versions: [{ version: 'v9', deprecated: false }],
    }).success).toBe(false)
  })
})
