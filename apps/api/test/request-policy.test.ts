import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { allowedOrigins } from '#api/env.js'
import { resolveCorsOrigin, skipPublic } from '#api/request-policy.js'

describe('resolveCorsOrigin', () => {
  it('echoes an allowed origin', () => {
    expect(resolveCorsOrigin(allowedOrigins[0])).toBe(allowedOrigins[0])
  })

  it('falls back to the first allowed origin when missing or unknown', () => {
    expect(resolveCorsOrigin('')).toBe(allowedOrigins[0])
    expect(resolveCorsOrigin('https://evil.example')).toBe(allowedOrigins[0])
  })
})

describe('skipPublic', () => {
  const app = new Hono()

  it('skips OPTIONS, health, and docs', async () => {
    app.use('*', async (c) => {
      return c.json({ skip: skipPublic(c) })
    })

    expect(await (await app.request('/health')).json()).toEqual({ skip: true })
    expect(await (await app.request('/')).json()).toEqual({ skip: true })
    expect(await (await app.request('/docs')).json()).toEqual({ skip: true })
    expect(await (await app.request('/openapi.json')).json()).toEqual({ skip: true })
    expect(await (await app.request('/v1/auth/me', { method: 'OPTIONS' })).json()).toEqual({ skip: true })
    expect(await (await app.request('/v1/auth/me')).json()).toEqual({ skip: false })
  })
})
