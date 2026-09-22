import { describe, expect, it, vi } from 'vitest'
import { DomainFailure } from '../utils/domain-failure'

const h3 = vi.hoisted(() => ({
  defineEventHandler: vi.fn((handler: unknown) => handler),
}))

vi.mock('h3', () => ({ defineEventHandler: h3.defineEventHandler }))

const { createDocsGuard } = await import('./docs-guard')

type Guard = (event: { path: string }) => unknown

const docsPaths = ['/api/docs', '/api/openapi.json', '/api/docs-assets/standalone.js']

describe('docs-guard', () => {
  it('passes through non-docs paths', () => {
    const guard = createDocsGuard(false) as unknown as Guard

    expect(guard({ path: '/api/v1/hello' })).toBeUndefined()
    expect(guard({ path: '/api/health' })).toBeUndefined()
    expect(guard({ path: '/api/v1/hello?foo=bar' })).toBeUndefined()
  })

  it('allows docs paths in development', () => {
    const guard = createDocsGuard(true) as unknown as Guard

    for (const path of docsPaths) {
      expect(guard({ path })).toBeUndefined()
    }
  })

  it('answers 404 for docs paths outside development', () => {
    const guard = createDocsGuard(false) as unknown as Guard

    for (const path of [...docsPaths, '/api/docs/unknown']) {
      expect(() => guard({ path })).toThrow(DomainFailure)
    }

    expect(() => guard({ path: '/api/docs?foo=bar' })).toThrow(DomainFailure)
  })
})
