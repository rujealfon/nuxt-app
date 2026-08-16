import { createRateLimit } from '@api/middleware/rate-limit.js'
import { Hono } from 'hono'
import { MemoryStore } from 'hono-rate-limiter'
import { describe, expect, it } from 'vitest'

describe('rate limit', () => {
  it('returns 429 after the limit is exceeded', async () => {
    const app = new Hono()
      .use(createRateLimit({
        limit: 1,
        windowMs: 60_000,
        store: new MemoryStore(),
      }))
      .get('/', c => c.json({ ok: true }))

    const first = await app.request('/')
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({ ok: true })

    const second = await app.request('/')
    expect(second.status).toBe(429)
    expect(await second.json()).toEqual({ error: 'Too many requests' })
  })

  it('skips OPTIONS and health on the global limiter', async () => {
    const app = new Hono()
      .use(createRateLimit({
        limit: 1,
        windowMs: 60_000,
        store: new MemoryStore(),
        skip: (c) => {
          if (c.req.method === 'OPTIONS')
            return true
          return c.req.path === '/health'
        },
      }))
      .get('/health', c => c.json({ status: 'ok' }))
      .get('/limited', c => c.json({ ok: true }))

    expect((await app.request('/health')).status).toBe(200)
    expect((await app.request('/health')).status).toBe(200)
    expect((await app.request('/limited')).status).toBe(200)
    expect((await app.request('/limited')).status).toBe(429)
    expect((await app.request('/limited', { method: 'OPTIONS' })).status).not.toBe(429)
  })
})
