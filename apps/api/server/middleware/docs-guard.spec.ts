import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DomainFailure } from '../utils/domain-failure'

const state = vi.hoisted(() => ({ docsEnabled: true }))

const h3 = vi.hoisted(() => ({
  defineEventHandler: vi.fn((handler: unknown) => handler),
}))

const nitro = vi.hoisted(() => ({
  useRuntimeConfig: vi.fn(() => ({ docsEnabled: state.docsEnabled })),
}))

vi.mock('h3', () => ({ defineEventHandler: h3.defineEventHandler }))
vi.mock('nitropack/runtime', () => ({ useRuntimeConfig: nitro.useRuntimeConfig }))

const guard = (await import('./docs-guard')).default as (event: { path: string }) => unknown

const { useRuntimeConfig } = nitro

describe('docs-guard', () => {
  beforeEach(() => {
    state.docsEnabled = true
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
    state.docsEnabled = false

    for (const path of ['/api/docs', '/api/openapi.json', '/api/docs-assets/standalone.js', '/api/docs/unknown']) {
      expect(() => guard({ path })).toThrowError(DomainFailure)
    }

    expect(useRuntimeConfig).toHaveBeenCalledTimes(4)
  })

  it('matches docs paths with query strings', () => {
    state.docsEnabled = false

    expect(() => guard({ path: '/api/docs?foo=bar' })).toThrowError(DomainFailure)
    expect(guard({ path: '/api/v1/hello?foo=bar' })).toBeUndefined()
  })
})
