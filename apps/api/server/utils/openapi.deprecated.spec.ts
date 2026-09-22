import { describe, expect, it, vi } from 'vitest'

// The shared registry has no deprecated version yet, so this spec stands one up
// to exercise the deprecation branches of the document builder.
vi.mock('@nuxt-app/config', () => ({
  apiVersions: ['v1'],
  currentApiVersion: 'v1',
  versionMeta: () => ({ version: 'v1', deprecated: true, sunset: '2026-12-31' }),
}))

const { buildOpenApiDocument, buildVersionedPaths } = await import('./openapi')

describe('deprecated version documentation', () => {
  it('advertises deprecation and sunset headers on versioned responses', () => {
    const headers = buildVersionedPaths()['/api/v1/hello']?.get?.responses['200']?.headers

    expect(headers?.deprecation).toBeDefined()
    expect(headers?.sunset).toBeDefined()
  })

  it('labels the version tag as deprecated', () => {
    const document = buildOpenApiDocument()

    expect(document.tags.find(tag => tag.name === 'v1')?.description).toContain('deprecated')
  })
})
