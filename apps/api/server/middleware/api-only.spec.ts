import { describe, expect, it, vi } from 'vitest'
import { DomainFailure } from '../utils/domain-failure'

const h3 = vi.hoisted(() => ({ defineEventHandler: vi.fn((handler: unknown) => handler) }))

vi.mock('h3', () => ({ defineEventHandler: h3.defineEventHandler }))

const handler = (await import('./api-only')).default as unknown as (event: { path: string }) => unknown

function caughtFrom(path: string): unknown {
  try {
    handler({ path })
  }
  catch (error) {
    return error
  }

  return undefined
}

describe('api-only middleware', () => {
  it.each(['/api', '/api/v1/hello', '/api/health?full=1'])('passes an API path through: %s', (path) => {
    expect(handler({ path })).toBeUndefined()
  })

  it.each(['/_nuxt/entry.js', '/__nuxt_error', '/@vite/client'])('passes framework internals through: %s', (path) => {
    expect(handler({ path })).toBeUndefined()
  })

  it.each(['/', '/docs', '/api-docs'])('rejects a non-API path: %s', (path) => {
    expect(caughtFrom(path)).toBeInstanceOf(DomainFailure)
  })

  it('uses the not_found code', () => {
    expect((caughtFrom('/') as DomainFailure).error).toBe('not_found')
  })
})
