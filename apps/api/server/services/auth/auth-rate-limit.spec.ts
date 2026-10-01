import type { Server } from 'node:http'
import { createServer, request as httpRequest } from 'node:http'
import { apiError } from '@nuxt-app/types'
import { createApp, eventHandler, setResponseStatus, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuth } from '../../database/auth'
import { DomainFailure } from '../../utils/domain-failure'
import { statusByError } from '../../utils/failure-contract'
import { createRateLimitStorage } from '../../utils/rate-limit'
import { handleAuthRequest } from './handle-auth-request'

const mocks = vi.hoisted(() => ({
  auth: undefined as unknown,
  eval: vi.fn(),
  loggerError: vi.fn(),
}))

// Nuxt supplies H3 as a transitive dependency; resolve that installed runtime.
vi.mock('h3', async () => {
  const { createRequire } = await import('node:module')
  const require = createRequire(import.meta.url)
  return import(require.resolve('h3', { paths: [require.resolve('nuxt/package.json')] }))
})

vi.mock('../../utils/auth', () => ({ useAuth: () => mocks.auth }))
vi.mock('../../utils/redis', () => ({ useRedis: () => ({ eval: mocks.eval }) }))
vi.mock('../../utils/logger', () => ({ useLogger: () => ({ error: mocks.loggerError }) }))
vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => ({ authBearerEnabled: false, authBearerOrigins: '', rateLimitEnabled: true }),
}))

describe('auth rate limiting through the Nitro request boundary', () => {
  let server: Server
  let baseURL: string
  const counters = new Map<string, number>()

  beforeAll(async () => {
    const app = createApp().use(eventHandler(async (event) => {
      try {
        return await handleAuthRequest(event)
      }
      catch (error) {
        if (!(error instanceof DomainFailure)) {
          throw error
        }
        setResponseStatus(event, statusByError[error.error])
        return apiError(error.error, error.message, error.details)
      }
    }))
    server = createServer(toNodeListener(app))
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('Expected a TCP listener')
    }
    baseURL = `http://127.0.0.1:${address.port}`
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VERCEL', '')
    counters.clear()
    mocks.eval.mockImplementation(async (_script: string, _keys: number, key: string, window: number) => {
      const count = (counters.get(key) ?? 0) + 1
      counters.set(key, count)
      return [count, window]
    })
    mocks.auth = createAuth({
      select: () => ({ from: () => ({ where: async () => [] }) }),
    } as never, {
      secret: 'test-secret-test-secret-test-secret',
      baseURL,
      rateLimitStorage: createRateLimitStorage({ failClosed: true }),
    })
  })

  afterAll(async () => {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    vi.unstubAllEnvs()
  })

  function signIn(ip: string) {
    // A well-formed password flow exercises the real handler with a database
    // fixture that returns no user, so guessing receives an ordinary 401.
    return fetch(`${baseURL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'origin': baseURL,
        'x-forwarded-for': ip,
        'x-auth-client-ip': ip,
      },
      body: JSON.stringify({ email: 'user@example.com', password: 'password123' }),
    })
  }

  it('keeps rotated forwarding and private headers in the socket IP sign-in budget', async () => {
    const statuses = []
    for (let i = 1; i <= 4; i++) {
      statuses.push((await signIn(`198.51.100.${i}`)).status)
    }
    expect(statuses).toEqual([401, 401, 401, 429])
    expect([...counters.keys()]).toEqual(['rate-limit:127.0.0.1:auth-prevalidation', 'rate-limit:127.0.0.1|/sign-in/email'])
  })

  it('puts arbitrary unknown paths in one bounded bucket and preserves JSON failures', async () => {
    for (let i = 0; i <= 100; i++) {
      const response = await fetch(`${baseURL}/api/auth/nonexistent-${i}`, {
        headers: { 'x-forwarded-for': `198.51.100.${i + 1}` },
      })
      expect(response.status).toBe(i < 100 ? 404 : 429)
      expect((await response.json()).error).toBe(i < 100 ? 'not_found' : 'rate_limited')
      if (i === 100) {
        expect(response.headers.get('x-retry-after')).toBe('60')
      }
    }
    expect([...counters.keys()]).toEqual(['rate-limit:127.0.0.1|unknown'])
  })

  it('bounds encoded, oversized, repeated-slash and special-prefix unknown paths with one policy', async () => {
    for (const path of ['/sign-in/unknown', '/%73ign-in/nope', '//missing', `/missing-${'x'.repeat(2000)}`, '/nope?next=/ok']) {
      expect((await fetch(`${baseURL}/api/auth${path}`)).status).toBe(404)
    }
    expect([...counters.keys()]).toEqual(['rate-limit:127.0.0.1|unknown'])
    expect(mocks.eval.mock.calls.map(call => call[3])).toEqual(Array.from({ length: 5 }).fill(60_000))
  })

  it('uses route templates for password-reset tokens and OAuth provider parameters', async () => {
    for (const value of ['first', 'second']) {
      await fetch(`${baseURL}/api/auth/reset-password/${value}`, { redirect: 'manual' })
      await fetch(`${baseURL}/api/auth/callback/${value}`, { redirect: 'manual' })
    }
    expect([...counters.keys()].sort()).toEqual([
      'rate-limit:127.0.0.1|/callback/:id',
      'rate-limit:127.0.0.1|/reset-password/:token',
    ])
  })

  it('keeps ordinary auth requests functional and their endpoint budgets separate', async () => {
    expect((await fetch(`${baseURL}/api/auth/ok`)).status).toBe(200)
    const session = await fetch(`${baseURL}/api/auth/get-session`)
    expect(session.status).toBe(200)
    await expect(session.json()).resolves.toBeNull()
    expect([...counters.keys()].sort()).toEqual([
      'rate-limit:127.0.0.1|/get-session',
      'rate-limit:127.0.0.1|/ok',
    ])
  })

  it('uses platform forwarding only on Vercel and preserves the strict endpoint policy', async () => {
    vi.stubEnv('VERCEL', '1')
    for (let i = 0; i < 3; i++) {
      expect((await signIn('198.51.100.10')).status).toBe(401)
    }
    expect((await signIn('198.51.100.10')).status).toBe(429)
    expect((await signIn('198.51.100.11')).status).toBe(401)
    expect([...counters.keys()].sort()).toEqual([
      'rate-limit:198.51.100.10:auth-prevalidation',
      'rate-limit:198.51.100.10|/sign-in/email',
      'rate-limit:198.51.100.11:auth-prevalidation',
      'rate-limit:198.51.100.11|/sign-in/email',
    ])
    expect(mocks.eval.mock.calls.filter(call => call[2].includes('|')).every(call => call[3] === 10_000)).toBe(true)
  })

  it('charges schema-invalid bodies across both password flows before parsing, despite spoofed headers', async () => {
    for (let i = 0; i <= 100; i++) {
      const path = i % 2 ? '/sign-up/email?source=web' : '/sign-in/email'
      const response = await fetch(`${baseURL}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${i}`, 'x-auth-client-ip': `198.51.100.${i}` },
        body: JSON.stringify({ name: '', email: 'invalid', password: '' }),
      })
      expect(response.status).toBe(i < 100 ? 400 : 429)
      const failure = await response.json()
      expect(failure.error).toBe(i < 100 ? 'invalid_input' : 'rate_limited')
      if (i < 100) {
        expect(failure.details).toContainEqual({ path: ['email'], message: 'Enter a valid email address' })
      }
      else {
        expect(response.headers.get('retry-after')).toBe('60')
        expect(response.headers.get('x-retry-after')).toBe('60')
      }
    }
    expect([...counters.keys()]).toEqual(['rate-limit:127.0.0.1:auth-prevalidation'])
  })

  it('rejects oversized JSON and UTF-8 form bodies before Better Auth or field validation', async () => {
    for (const [path, contentType, body] of [
      ['/sign-up/email', 'application/json', JSON.stringify({ name: 'x'.repeat(16 * 1024), email: 'invalid', password: '' })],
      ['/sign-in/email', 'application/x-www-form-urlencoded', `email=invalid&password=${'é'.repeat(9 * 1024)}`],
    ]) {
      const response = await fetch(`${baseURL}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': contentType! },
        body,
      })
      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({ error: 'invalid_input', message: 'The authentication request body is too large' })
    }
    expect([...counters.keys()]).toEqual(['rate-limit:127.0.0.1:auth-prevalidation'])
  })

  it('rejects a chunked overflow before the upload ends and safely closes the connection', async () => {
    const result = await new Promise<{ status: number | undefined, body: string }>((resolve, reject) => {
      const request = httpRequest(`${baseURL}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      }, (response) => {
        let body = ''
        response.on('data', chunk => body += chunk)
        response.on('end', () => resolve({ status: response.statusCode, body }))
      })
      request.on('error', reject)
      request.write('{"name":"')
      request.write('x'.repeat(17 * 1024))
      // Deliberately never end: rejection must not await the rest of the body.
    })
    expect(result.status).toBe(400)
    expect(JSON.parse(result.body)).toEqual({ error: 'invalid_input', message: 'The authentication request body is too large' })
    expect((await fetch(`${baseURL}/api/auth/ok`)).status).toBe(200)
  })

  it('bounds raw dot-segment aliases before H3 canonicalizes the destination', async () => {
    for (const path of ['/api/auth/x/../sign-in/email', '/api/auth/x/%2e%2e/sign-up/email']) {
      const result = await new Promise<{ status: number | undefined, body: string }>((resolve, reject) => {
        const request = httpRequest(baseURL, { path, method: 'POST', headers: { 'content-type': 'application/json' } }, (response) => {
          let body = ''
          response.on('data', chunk => body += chunk)
          response.on('end', () => resolve({ status: response.statusCode, body }))
        })
        request.on('error', reject)
        request.end(JSON.stringify({ email: 'invalid', password: 'x'.repeat(17 * 1024) }))
      })
      expect(result.status).toBe(400)
      expect(JSON.parse(result.body)).toEqual({ error: 'invalid_input', message: 'The authentication request body is too large' })
    }
    expect([...counters.keys()]).toEqual(['rate-limit:127.0.0.1:auth-prevalidation'])
  })

  it('preserves supported form credentials and charges malformed JSON to the same pre-parse budget', async () => {
    const form = await fetch(`${baseURL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'origin': baseURL },
      body: 'email=user%40example.com&password=password123',
    })
    expect(form.status).toBe(401)
    const malformed = await fetch(`${baseURL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'origin': baseURL },
      body: '{',
    })
    expect(malformed.status).toBe(400)
    expect(counters.get('rate-limit:127.0.0.1:auth-prevalidation')).toBe(2)
  })

  it('denies password bodies before reading when Redis is unavailable', async () => {
    mocks.eval.mockRejectedValue(new Error('ECONNREFUSED'))
    const response = await fetch(`${baseURL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"name":""}',
    })
    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toMatchObject({ error: 'rate_limited' })
    expect(mocks.eval).toHaveBeenCalledTimes(1)
  })

  it('denies auth requests and retains retry hints when Redis is unavailable', async () => {
    mocks.eval.mockRejectedValue(new Error('ECONNREFUSED'))
    const response = await fetch(`${baseURL}/api/auth/ok`)
    expect(response.status).toBe(429)
    expect(response.headers.get('x-retry-after')).toBe('60')
    await expect(response.json()).resolves.toMatchObject({ error: 'rate_limited' })
    expect(mocks.loggerError).toHaveBeenCalled()
  })
})
