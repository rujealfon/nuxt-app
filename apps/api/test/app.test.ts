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
      body: JSON.stringify({ email: 'ada@example.com', password: 'short', name: 'A' }),
    })
    expect(res.status).toBe(422)
    expect((body.error as { issues: Array<{ message?: string }> }).issues[0]?.message)
      .toBe('Password must be at least 8 characters')
  })

  it('rejects a malformed register email', async () => {
    const { res, body } = await json('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'x', password: 'password12', name: 'Ada' }),
    })
    expect(res.status).toBe(422)
    expect((body.error as { issues: Array<{ message?: string }> }).issues[0]?.message)
      .toBe('Invalid email')
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

  it('treats a malformed session cookie as no session', async () => {
    const cookie = 'nuxt_app_session=not-a-uuid'
    const me = await json('/auth/me', { headers: { Cookie: cookie } })
    expect(me.res.status).toBe(200)
    expect(me.body).toEqual({ user: null })

    const logout = await json('/auth/logout', {
      method: 'POST',
      headers: {
        Cookie: cookie,
        Origin: 'http://localhost:3000',
      },
    })
    expect(logout.res.status).toBe(200)
    expect(logout.body).toEqual({ message: 'Logged out' })
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

  it('validates nanoid path params', () => {
    expect(idParamsSchema.parse({ id: 'V1StGXR8_Z5jdHi6B-myT' })).toEqual({
      id: 'V1StGXR8_Z5jdHi6B-myT',
    })
    expect(idParamsSchema.safeParse({ id: 'not a nanoid' }).success).toBe(false)
  })

  it('fills public_id from the SQL nanoid() default on raw insert', async () => {
    const { pool } = await import('@api/db')
    const email = `sql-id-${Date.now()}@example.com`
    const result = await pool.query<{ public_id: string }>(
      `INSERT INTO users (email, name, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, now(), now())
       RETURNING public_id`,
      [email, 'SqlId', 'x'],
    )
    expect(result.rows[0].public_id).toMatch(/^[\w-]{21}$/)
  })

  it('returns public_id as user.id and never the uuid pk', async () => {
    const email = `pub-${Date.now()}@example.com`
    const password = 'password12'
    const registered = await json('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'Pub' }),
    })
    expect(registered.res.status).toBe(200)
    expect(registered.body).toEqual({ message: 'Registered successfully' })

    const { res, body } = await json('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    expect(res.status).toBe(200)
    const user = body.user as { id: string }
    expect(user.id).toMatch(/^[\w-]{21}$/)
    expect(user.id).not.toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('does not reveal whether an email is already registered', async () => {
    const email = `dup-${Date.now()}@example.com`
    const payload = JSON.stringify({ email, password: 'password12', name: 'Dup' })
    const first = await json('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })
    const second = await json('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })
    expect(first.res.status).toBe(200)
    expect(second.res.status).toBe(200)
    expect(first.body).toEqual(second.body)
    expect(first.body).toEqual({ message: 'Registered successfully' })
  })
})
