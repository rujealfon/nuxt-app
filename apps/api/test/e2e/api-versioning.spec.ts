import { fileURLToPath } from 'node:url'
import { $fetch, fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('api versioning', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    server: true,
    build: true,
  })

  it('reports the version registry at /api', async () => {
    const data = await $fetch('/api')

    expect(data).toEqual({
      current: 'v1',
      versions: [{ version: 'v1', deprecated: false }],
    })
  })

  it('serves versioned routes and advertises the version', async () => {
    const response = await fetch('/api/v1/hello')

    expect(response.status).toBe(200)
    expect(response.headers.get('x-api-version')).toBe('v1')
    expect(await response.json()).toEqual({ message: 'Hello from api.nuxt-app.com' })
  })

  it('returns a JSON 404 when the version prefix is missing', async () => {
    const response = await fetch('/api/hello')

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: 'not_found',
      message: 'The requested resource was not found',
    })
  })

  it('returns a JSON 404 for unknown versions', async () => {
    const response = await fetch('/api/v9/hello')

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: 'not_found',
      message: 'The requested resource was not found',
    })
  })

  it('keeps health checks unversioned', async () => {
    const response = await fetch('/api/health')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ status: 'ok' })
  })

  it('returns a JSON 404 for the origin instead of the Nuxt welcome page', async () => {
    const response = await fetch('/')

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toMatch(/json/)
    await expect(response.json()).resolves.toEqual({
      error: 'not_found',
      message: 'The requested resource was not found',
    })
  })

  it('returns a JSON 404 for non-API paths', async () => {
    const response = await fetch('/docs')

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toMatch(/json/)
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('cache-control')).toBe('no-cache')
    await expect(response.json()).resolves.toEqual({
      error: 'not_found',
      message: 'The requested resource was not found',
    })
  })
})
