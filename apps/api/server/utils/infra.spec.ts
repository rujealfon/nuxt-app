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
})
