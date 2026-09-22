import { describe, expect, it, vi } from 'vitest'

const h3 = vi.hoisted(() => ({ defineEventHandler: vi.fn((handler: unknown) => handler) }))

vi.mock('h3', () => ({ defineEventHandler: h3.defineEventHandler }))

interface OpenApiDocument {
  openapi: string
  paths: Record<string, unknown>
  components: { schemas: Record<string, unknown> }
}

const handler = (await import('./openapi.json.get')).default as unknown as (event: unknown) => OpenApiDocument

describe('get /api/openapi.json', () => {
  it('serves the OpenAPI document', () => {
    const document = handler({})

    expect(document.openapi).toBe('3.1.0')
    expect(document.paths['/api/v1/hello']).toBeDefined()
    expect(document.components.schemas.HelloResponse).toBeDefined()
  })
})
