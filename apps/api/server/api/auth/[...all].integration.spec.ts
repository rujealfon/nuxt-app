import type { Server } from 'node:http'
import { createServer } from 'node:http'
import { createApp, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// The real h3 app, the real error adapter, the real `defineResultHandler` and the real
// `handleAuthRequest` pipeline answer a real HTTP request. Only the two things that need
// external services are substituted: Better Auth's handler and the rate-limit decision.
// The behavior pinned here is the one the route had before `handleAuthRequest` returned a
// `Result` (it threw the failure and Nitro's error adapter rendered it).
const mocks = vi.hoisted(() => ({
  authHandler: vi.fn<(request: Request) => Promise<Response>>(),
  consume: vi.fn(),
  loggerError: vi.fn(),
  config: { rateLimitEnabled: true, authBearerEnabled: false, authBearerOrigins: '' },
}))

vi.mock('nitropack/runtime', () => ({
  defineNitroErrorHandler: (handler: unknown) => handler,
  useRuntimeConfig: () => mocks.config,
}))
vi.mock('#server/utils/auth', () => ({ useAuth: () => ({ handler: mocks.authHandler }) }))
vi.mock('#server/utils/rate-limit', () => ({
  createRateLimitStorage: () => ({ consume: mocks.consume }),
}))
vi.mock('#server/utils/logger', () => ({
  useLogger: () => ({ error: mocks.loggerError, warn: vi.fn() }),
}))

const route = (await import('./[...all]')).default
const errorAdapter = (await import('#server/error-adapter')).default as unknown as (
  error: unknown,
  event: unknown,
) => unknown

const json = { 'content-type': 'application/json' }

describe('auth route over HTTP with the real error adapter', () => {
  let server: Server
  let baseURL: string

  beforeAll(async () => {
    // Nitro builds its app the same way: the error handler is h3's `onError`.
    const app = createApp({ onError: errorAdapter }).use(route)
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
    mocks.consume.mockResolvedValue({ allowed: true })
  })

  afterAll(async () => {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
    })
    vi.unstubAllEnvs()
  })

  function signIn(body: unknown) {
    return fetch(`${baseURL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify(body),
    })
  }

  const credentials = { email: 'user@example.com', password: 'password123' }

  describe('ok', () => {
    it('returns the Better Auth response unchanged', async () => {
      mocks.authHandler.mockResolvedValue(new Response(JSON.stringify({ user: { id: 'u1' } }), {
        status: 201,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'session=abc; HttpOnly; Path=/',
          'x-custom': 'kept',
        },
      }))

      const response = await fetch(`${baseURL}/api/auth/get-session`)

      expect(response.status).toBe(201)
      expect(response.headers.get('content-type')).toBe('application/json')
      expect(response.headers.get('x-custom')).toBe('kept')
      expect(response.headers.getSetCookie()).toEqual(['session=abc; HttpOnly; Path=/'])
      await expect(response.json()).resolves.toEqual({ user: { id: 'u1' } })
      expect(mocks.authHandler).toHaveBeenCalledTimes(1)
      expect(mocks.loggerError).not.toHaveBeenCalled()
    })
  })

  describe('rate limited', () => {
    it('answers 429 from the pre-validation limiter with both retry headers', async () => {
      mocks.consume.mockResolvedValue({ allowed: false, retryAfter: 42 })

      const response = await signIn(credentials)

      expect(response.status).toBe(429)
      expect(response.headers.get('content-type')).toMatch(/^application\/json/)
      expect(response.headers.get('x-retry-after')).toBe('42')
      expect(response.headers.get('retry-after')).toBe('42')
      expect(response.headers.get('x-content-type-options')).toBe('nosniff')
      await expect(response.json()).resolves.toEqual({
        error: 'rate_limited',
        message: 'Too many requests',
      })
      expect(mocks.authHandler).not.toHaveBeenCalled()
    })

    it('preserves the retry hint when Better Auth itself rate limits', async () => {
      mocks.authHandler.mockResolvedValue(new Response(
        JSON.stringify({ message: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...json, 'x-retry-after': '30' } },
      ))

      const response = await fetch(`${baseURL}/api/auth/get-session`)

      expect(response.status).toBe(429)
      expect(response.headers.get('x-retry-after')).toBe('30')
      await expect(response.json()).resolves.toEqual({
        error: 'rate_limited',
        message: 'Too many requests. Please try again later.',
      })
    })
  })

  describe('auth failure with cookies', () => {
    it('keeps the error envelope and every Set-Cookie on the failure response', async () => {
      const headers = new Headers(json)
      headers.append('set-cookie', 'better-auth.session_token=; Max-Age=0; Path=/; HttpOnly')
      headers.append('set-cookie', 'better-auth.dont_remember=; Max-Age=0; Path=/')
      headers.set('x-better-auth-internal', 'must-not-leak')
      mocks.authHandler.mockResolvedValue(new Response(
        JSON.stringify({ message: 'Invalid email or password', code: 'INVALID_EMAIL_OR_PASSWORD' }),
        { status: 401, headers },
      ))

      const response = await signIn(credentials)

      expect(response.status).toBe(401)
      expect(response.headers.getSetCookie()).toEqual([
        'better-auth.session_token=; Max-Age=0; Path=/; HttpOnly',
        'better-auth.dont_remember=; Max-Age=0; Path=/',
      ])
      expect(response.headers.get('x-better-auth-internal')).toBeNull()
      await expect(response.json()).resolves.toEqual({
        error: 'unauthenticated',
        message: 'Invalid email or password',
      })
    })

    it('maps Better Auth codes to the contract (conflict) and drops its code', async () => {
      mocks.authHandler.mockResolvedValue(new Response(
        JSON.stringify({ message: 'User already exists', code: 'USER_ALREADY_EXISTS' }),
        { status: 422, headers: { ...json, 'set-cookie': 'a=b; Path=/' } },
      ))

      const response = await signIn(credentials)

      expect(response.status).toBe(409)
      expect(response.headers.getSetCookie()).toEqual(['a=b; Path=/'])
      await expect(response.json()).resolves.toEqual({
        error: 'conflict',
        message: 'User already exists',
      })
    })
  })

  describe('invalid input', () => {
    it('answers 400 with field details without calling Better Auth', async () => {
      const response = await signIn({ email: 'nope', password: '' })

      expect(response.status).toBe(400)
      expect(response.headers.get('content-type')).toMatch(/^application\/json/)
      await expect(response.json()).resolves.toEqual({
        error: 'invalid_input',
        message: 'The request was invalid',
        details: [
          { path: ['email'], message: 'Enter a valid email address' },
          { path: ['password'], message: 'Password is required' },
        ],
      })
      expect(mocks.authHandler).not.toHaveBeenCalled()
    })

    it('answers 400 for an oversized body and closes without calling Better Auth', async () => {
      const response = await fetch(`${baseURL}/api/auth/sign-out`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ name: 'x'.repeat(17 * 1024) }),
      })

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({
        error: 'invalid_input',
        message: 'The authentication request body is too large',
      })
      expect(mocks.authHandler).not.toHaveBeenCalled()
    })
  })

  describe('unexpected failures', () => {
    it('answers 500 internal_error without leaking a rejection and logs it', async () => {
      mocks.authHandler.mockRejectedValue(
        new Error('connect ECONNREFUSED db.internal:5432 pw=hunter2'),
      )

      const response = await fetch(`${baseURL}/api/auth/get-session`)
      const text = await response.text()

      expect(response.status).toBe(500)
      expect(JSON.parse(text)).toEqual({
        error: 'internal_error',
        message: 'An unexpected error occurred',
      })
      expect(text).not.toMatch(/ECONNREFUSED|hunter2|db\.internal|stack/i)
      expect(mocks.loggerError).toHaveBeenCalledTimes(1)
    })

    it('conceals a Better Auth 5xx message and keeps its cookies', async () => {
      mocks.authHandler.mockResolvedValue(new Response(
        JSON.stringify({ message: 'relation "user" is missing', code: 'FAILED_TO_GET_SESSION' }),
        { status: 500, headers: { ...json, 'set-cookie': 'a=b; Path=/' } },
      ))

      const response = await signIn(credentials)
      const text = await response.text()

      expect(response.status).toBe(500)
      expect(JSON.parse(text)).toEqual({
        error: 'internal_error',
        message: 'An unexpected error occurred',
      })
      expect(text).not.toContain('relation')
      expect(response.headers.getSetCookie()).toEqual(['a=b; Path=/'])
    })
  })
})
