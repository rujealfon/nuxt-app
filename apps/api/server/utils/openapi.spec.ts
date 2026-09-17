import { apiVersions, currentApiVersion } from '@nuxt-app/config'
import { describe, expect, it } from 'vitest'
import { buildOpenApiDocument } from './openapi'

describe('buildOpenApiDocument', () => {
  it('reports the current version as the document version', () => {
    const document = buildOpenApiDocument()

    expect(document.openapi).toMatch(/^3\./)
    expect(document.info.version).toBe(currentApiVersion)
  })

  it('covers every registered version with tags and versioned paths', () => {
    const document = buildOpenApiDocument()

    for (const version of apiVersions) {
      expect(document.tags.map(tag => tag.name)).toContain(version)
      expect(
        Object.keys(document.paths).some(path => path.startsWith(`/api/${version}/`)),
        `expected a documented path for ${version}`,
      ).toBe(true)
    }
  })

  it('documents the version advertisement headers on the hello operation', () => {
    const document = buildOpenApiDocument()
    const response = document.paths['/api/v1/hello']?.get.responses['200']

    expect(response?.headers?.['x-api-version']?.schema).toEqual({
      type: 'string',
      enum: ['v1'],
    })
    expect(response?.content?.['application/json']?.schema).toEqual({
      $ref: '#/components/schemas/HelloResponse',
    })
  })

  it('derives component schemas from the shared Zod contracts', () => {
    const document = buildOpenApiDocument()

    expect(document.components.schemas.HelloResponse).toMatchObject({
      type: 'object',
      properties: { message: { type: 'string' } },
    })
    expect(document.components.schemas.ProductError).toMatchObject({
      type: 'object',
    })
    expect(JSON.stringify(document.components.schemas.ProductError)).toContain('not_found')
  })

  it('keeps docs, spec, and API on one origin so try-it needs no CORS', () => {
    const document = buildOpenApiDocument()

    expect(document.servers).toEqual([
      { url: '/', description: expect.any(String) },
    ])
  })
})
