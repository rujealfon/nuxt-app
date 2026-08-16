import app from '@api/app.js'
import { idParamsSchema } from '@api/lib/schemas.js'
import { describe, expect, it } from 'vitest'

async function json(path: string, init?: RequestInit) {
  const res = await app.request(path, init)
  return { res, body: await res.json() as Record<string, unknown> }
}

describe('api', () => {
  it('returns health', async () => {
    const { res, body } = await json('/health')
    expect(res.status).toBe(200)
    expect(body).toEqual({ status: 'ok' })
  })

  it('returns service status on /', async () => {
    const { res, body } = await json('/')
    expect(res.status).toBe(200)
    expect(body).toEqual({ status: 'ok', service: 'nuxt-app-api' })
  })

  it('does not expose Scalar outside development', async () => {
    const { res, body } = await json('/openapi.json')
    expect(res.status).toBe(404)
    expect(body).toEqual({ message: 'Not Found' })
  })

  it('returns 404 json', async () => {
    const { res, body } = await json('/nope')
    expect(res.status).toBe(404)
    expect(body).toEqual({ message: 'Not Found' })
  })

  it('rejects empty register payload', async () => {
    const { res, body } = await json('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })
    expect(res.status).toBe(422)
    expect(body.success).toBe(false)
    expect((body.error as { issues: Array<{ message?: string }> }).issues[0]?.message)
      .toBe('Email, password and name are required')
  })

  it('rejects short register password', async () => {
    const { res, body } = await json('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.c', password: 'short', name: 'A' }),
    })
    expect(res.status).toBe(422)
    expect((body.error as { issues: Array<{ message?: string }> }).issues[0]?.message)
      .toBe('Password must be at least 8 characters')
  })

  it('rejects empty login payload', async () => {
    const { res, body } = await json('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(422)
    expect((body.error as { issues: Array<{ message?: string }> }).issues[0]?.message)
      .toBe('Email and password are required')
  })

  it('returns null user when unauthenticated', async () => {
    const { res, body } = await json('/auth/me')
    expect(res.status).toBe(200)
    expect(body).toEqual({ user: null })
  })

  it('rejects unauthenticated admin routes', async () => {
    const { res, body } = await json('/admin/dashboard')
    expect(res.status).toBe(401)
    expect(body).toEqual({ message: 'Unauthorized' })
  })

  it('generates an OpenAPI spec from registered routes', async () => {
    const document = app.getOpenAPI31Document({
      openapi: '3.1.0',
      info: { title: 'nuxt-app API', version: '0.0.0' },
    })
    const paths = Object.keys(document.paths ?? {})
    expect(paths).toEqual(expect.arrayContaining([
      '/health',
      '/auth/register',
      '/auth/login',
      '/auth/logout',
      '/auth/me',
      '/admin/dashboard',
    ]))
  })

  it('validates uuid path params', () => {
    expect(idParamsSchema.parse({ id: '4651e634-a530-4484-9b09-9616a28f35e3' })).toEqual({
      id: '4651e634-a530-4484-9b09-9616a28f35e3',
    })
    expect(idParamsSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false)
  })
})
