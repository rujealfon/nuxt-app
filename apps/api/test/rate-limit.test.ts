import { createRateLimit, resolveClientKey } from '@api/middleware/rate-limit.js'
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
    expect(await second.json()).toEqual({ message: 'Too Many Requests' })
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

  it('does not let a client rotate X-Forwarded-For to bypass the limiter', async () => {
    const app = new Hono()
      .use(createRateLimit({
        limit: 1,
        windowMs: 60_000,
        store: new MemoryStore(),
      }))
      .get('/', c => c.json({ ok: true }))

    const first = await app.request('/', {
      headers: { 'X-Forwarded-For': '203.0.113.10' },
    })
    const other = await app.request('/', {
      headers: { 'X-Forwarded-For': '203.0.113.11' },
    })

    expect(first.status).toBe(200)
    expect(other.status).toBe(429)
  })
})

describe('resolveClientKey', () => {
  it('prefers the forwarded address only when a proxy is trusted', () => {
    expect(resolveClientKey({
      remoteAddress: '10.0.0.1',
      forwardedFor: '203.0.113.10, 10.0.0.1',
      trustProxy: true,
    })).toBe('203.0.113.10')
  })

  it('uses the socket address when a proxy is not trusted', () => {
    expect(resolveClientKey({
      remoteAddress: '10.0.0.1',
      forwardedFor: '203.0.113.10',
    })).toBe('10.0.0.1')
  })

  it('uses the socket address when no forwarded header is present', () => {
    expect(resolveClientKey({ remoteAddress: '10.0.0.1' })).toBe('10.0.0.1')
  })

  it('falls back to unknown when neither address is available', () => {
    expect(resolveClientKey({})).toBe('unknown')
  })
})
