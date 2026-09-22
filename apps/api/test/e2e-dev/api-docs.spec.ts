import { fileURLToPath } from 'node:url'
import { fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('api docs (dev server)', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    server: true,
    dev: true,
  })

  it('serves the OpenAPI document at /api/openapi.json', async () => {
    const response = await fetch('/api/openapi.json')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toMatch(/json/)

    const document = await response.json()

    expect(document.openapi).toMatch(/^3\./)
    expect(document.info.version).toBe('v1')
    expect(document.paths['/api/v1/hello'].get.responses['200']).toMatchObject({
      headers: { 'x-api-version': { schema: { type: 'string', enum: ['v1'] } } },
    })
    expect(document.components.schemas.HelloResponse).toMatchObject({
      type: 'object',
      properties: { message: { type: 'string' } },
    })
    expect(document.components.securitySchemes).toMatchObject({
      sessionCookie: { type: 'apiKey', in: 'cookie', name: 'better-auth.session_token' },
      bearerAuth: { type: 'http', scheme: 'bearer' },
    })
  })

  it('keeps the spec unversioned like other infra routes', async () => {
    const response = await fetch('/api/openapi.json')

    expect(response.headers.get('x-api-version')).toBeNull()
  })

  it('serves the Scalar UI shell at /api/docs', async () => {
    const response = await fetch('/api/docs')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toMatch(/text\/html/)
    expect(response.headers.get('x-api-version')).toBeNull()

    const html = await response.text()

    expect(html).toContain('<div id="app"></div>')
    expect(html).toContain('/api/openapi.json')
    expect(html).toContain('/api/docs-assets/standalone.js')
    expect(html).toContain('createApiReference')
  })

  it('self-hosts the Scalar bundle instead of a CDN', async () => {
    const response = await fetch('/api/docs-assets/standalone.js')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toMatch(/javascript/)
    expect(response.headers.get('cache-control')).toBe('no-store')

    const bundle = await response.text()

    expect(bundle).toContain('createApiReference')
  })

  it('returns a JSON 404 for unknown docs paths', async () => {
    const response = await fetch('/api/docs/unknown')

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toMatch(/json/)
    await expect(response.json()).resolves.toEqual({
      error: 'not_found',
      message: 'The requested resource was not found',
    })
  })
})
