import { describe, expect, it, vi } from 'vitest'

// The shared registry has no deprecated version yet, so this spec stands one up
// to exercise the deprecation branches of the document builder. The operation
// table still comes from the real contracts, so the documented paths match.
vi.mock('@nuxt-app/config', async () => {
  const { v1 } = await vi.importActual<typeof import('@nuxt-app/types')>('@nuxt-app/types')

  return {
    apiVersions: ['v1'],
    currentApiVersion: 'v1',
    versionedOperations: { v1: v1.operations },
    versionMeta: () => ({ version: 'v1', deprecated: true, sunset: '2026-12-31' }),
  }
})

const { buildOpenApiDocument, buildVersionedPaths } = await import('./openapi')

describe('deprecated version documentation', () => {
  it('advertises deprecation and sunset headers on versioned responses', () => {
    const headers = buildVersionedPaths()['/api/v1/hello']?.get?.responses['200']?.headers

    expect(headers?.deprecation).toBeDefined()
    expect(headers?.sunset).toBeDefined()
  })

  it('marks deprecated operations within their module group', () => {
    const document = buildOpenApiDocument()

    expect(document.paths['/api/v1/hello']?.get?.deprecated).toBe(true)
    expect(document.paths['/api/v1/hello']?.get?.tags).toEqual(['Greeting'])
    expect(document.tags.map(tag => tag.name)).not.toContain('v1')
  })
})
