import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DomainFailure } from '../utils/domain-failure'

let docsEnabled = true
const useRuntimeConfig = vi.fn(() => ({ docsEnabled }))
const defineEventHandler = vi.fn((handler: unknown) => handler)

vi.stubGlobal('useRuntimeConfig', useRuntimeConfig)
vi.stubGlobal('defineEventHandler', defineEventHandler)
vi.stubGlobal('domainFailure', (error: 'not_found') => {
  throw new DomainFailure(error)
})

const guard = (await import('./docs-guard')).default as (event: { path: string }) => unknown

describe('docs-guard', () => {
  beforeEach(() => {
    docsEnabled = true
    useRuntimeConfig.mockClear()
  })

  it('passes through non-docs paths without reading runtime config', () => {
    expect(guard({ path: '/api/v1/hello' })).toBeUndefined()
    expect(guard({ path: '/api/health' })).toBeUndefined()
    expect(useRuntimeConfig).not.toHaveBeenCalled()
  })

  it('serves docs paths when enabled', () => {
    for (const path of ['/api/docs', '/api/openapi.json', '/api/docs-assets/standalone.js']) {
      expect(guard({ path })).toBeUndefined()
    }
  })

  it('answers 404 for docs paths when disabled', () => {
    docsEnabled = false

    for (const path of ['/api/docs', '/api/openapi.json', '/api/docs-assets/standalone.js', '/api/docs/unknown']) {
      expect(() => guard({ path })).toThrowError(DomainFailure)
    }

    expect(useRuntimeConfig).toHaveBeenCalledTimes(4)
  })

  it('matches docs paths with query strings', () => {
    docsEnabled = false

    expect(() => guard({ path: '/api/docs?foo=bar' })).toThrowError(DomainFailure)
    expect(guard({ path: '/api/v1/hello?foo=bar' })).toBeUndefined()
  })
})
