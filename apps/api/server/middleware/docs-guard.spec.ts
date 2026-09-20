import { describe, expect, it, vi } from 'vitest'
import { DomainFailure } from '../utils/domain-failure'

const h3 = vi.hoisted(() => ({
  defineEventHandler: vi.fn((handler: unknown) => handler),
}))

vi.mock('h3', () => ({ defineEventHandler: h3.defineEventHandler }))

const { default: guard } = await import('./docs-guard') as { default: (event: { path: string }) => unknown }

describe('docs-guard', () => {
  it('passes through non-docs paths', () => {
    expect(guard({ path: '/api/v1/hello' })).toBeUndefined()
    expect(guard({ path: '/api/health' })).toBeUndefined()
    expect(guard({ path: '/api/v1/hello?foo=bar' })).toBeUndefined()
  })

  it.skipIf(!import.meta.dev)('allows docs paths in development', () => {
    for (const path of ['/api/docs', '/api/openapi.json', '/api/docs-assets/standalone.js']) {
      expect(guard({ path })).toBeUndefined()
    }
  })

  it.skipIf(import.meta.dev)('answers 404 for docs paths outside development', () => {
    for (const path of ['/api/docs', '/api/openapi.json', '/api/docs-assets/standalone.js', '/api/docs/unknown']) {
      expect(() => guard({ path })).toThrowError(DomainFailure)
    }

    expect(() => guard({ path: '/api/docs?foo=bar' })).toThrowError(DomainFailure)
  })
})
