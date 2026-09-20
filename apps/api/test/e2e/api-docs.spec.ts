import { fileURLToPath } from 'node:url'
import { fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const notFound = {
  error: 'not_found',
  message: 'The requested resource was not found',
}

describe('api docs (production build)', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    server: true,
    build: true,
  })

  it.each([
    '/api/docs',
    '/api/openapi.json',
    '/api/docs-assets/standalone.js',
    '/api/docs/unknown',
  ])('returns a JSON 404 for %s', async (path) => {
    const response = await fetch(path)

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toMatch(/json/)
    await expect(response.json()).resolves.toEqual(notFound)
  })
})
