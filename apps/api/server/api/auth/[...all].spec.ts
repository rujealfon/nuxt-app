import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DomainFailure } from '../../utils/domain-failure'

const mocks = vi.hoisted(() => {
  const handler = vi.fn()

  return {
    handler,
    defineEventHandler: vi.fn((route: unknown) => route),
    toWebRequest: vi.fn(),
    setResponseHeader: vi.fn(),
    appendResponseHeader: vi.fn(),
    useAuth: vi.fn(() => ({ handler })),
    config: {
      authBearerEnabled: true,
      authBearerOrigins: 'capacitor://localhost',
    },
  }
})

vi.mock('h3', () => ({
  defineEventHandler: mocks.defineEventHandler,
  toWebRequest: mocks.toWebRequest,
  setResponseHeader: mocks.setResponseHeader,
  appendResponseHeader: mocks.appendResponseHeader,
}))

vi.mock('nitropack/runtime', () => ({ useRuntimeConfig: () => mocks.config }))
vi.mock('../../utils/auth', () => ({ useAuth: mocks.useAuth }))

const route = (await import('./[...all]')).default as unknown as (event: unknown) => Promise<unknown>

function caughtFrom(event: unknown): Promise<unknown> {
  return route(event).then(() => undefined, (error: unknown) => error)
}

function request(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, init)
}

function sessionResponse() {
  return new Response('{"session":true}', {
    headers: {
      'set-cookie': 'better-auth.session_token=secret; HttpOnly; Path=/',
      'set-auth-token': 'secret',
      'access-control-expose-headers': 'set-auth-token',
    },
  })
}

describe('auth mount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('pre-validates a password flow and throws invalid_input with details', async () => {
    mocks.toWebRequest.mockReturnValue(request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '', email: 'not-an-email', password: '' }),
    }))

    const caught = await caughtFrom({ path: '/api/auth/sign-up/email' })

    expect(caught).toBeInstanceOf(DomainFailure)
    expect((caught as DomainFailure).error).toBe('invalid_input')
    expect((caught as DomainFailure).details).toEqual([
      { path: ['name'], message: 'Name is required' },
      { path: ['email'], message: 'Enter a valid email address' },
      { path: ['password'], message: 'Password must be at least 8 characters' },
    ])
    expect(mocks.handler).not.toHaveBeenCalled()
  })

  it('leaves a non-JSON password-flow body to Better Auth', async () => {
    mocks.toWebRequest.mockReturnValue(request('/api/auth/sign-in/email', { method: 'POST' }))
    const response = new Response(null, { status: 200 })
    mocks.handler.mockResolvedValue(response)

    await expect(route({ path: '/api/auth/sign-in/email' })).resolves.toBe(response)
    expect(mocks.handler).toHaveBeenCalledWith(expect.any(Request))
  })

  it('returns the Better Auth response on success', async () => {
    mocks.toWebRequest.mockReturnValue(request('/api/auth/get-session'))
    const response = new Response(JSON.stringify({ session: null }), { status: 200 })
    mocks.handler.mockResolvedValue(response)

    await expect(route({ path: '/api/auth/get-session' })).resolves.toBe(response)
  })

  it('preserves retry and cookie headers on a Better Auth failure', async () => {
    mocks.toWebRequest.mockReturnValue(request('/api/auth/get-session'))
    const response = new Response(JSON.stringify({ code: 'INVALID_EMAIL_OR_PASSWORD', message: 'bad' }), {
      status: 401,
      headers: {
        'x-retry-after': '30',
        'set-cookie': 'better-auth.session_token=; Max-Age=0',
      },
    })
    mocks.handler.mockResolvedValue(response)
    const event = { path: '/api/auth/get-session' }

    const caught = await caughtFrom(event)

    expect(mocks.setResponseHeader).toHaveBeenCalledWith(event, 'x-retry-after', '30')
    expect(mocks.appendResponseHeader).toHaveBeenCalledWith(
      event,
      'set-cookie',
      expect.stringContaining('session_token'),
    )
    expect(caught).toBeInstanceOf(DomainFailure)
    expect((caught as DomainFailure).error).toBe('unauthenticated')
  })

  it('preserves cookies even without a retry hint', async () => {
    mocks.toWebRequest.mockReturnValue(request('/api/auth/get-session'))
    mocks.handler.mockResolvedValue({
      status: 401,
      headers: {
        get: vi.fn(() => undefined),
        getSetCookie: vi.fn(() => ['a=1', 'b=2']),
      },
      clone: () => ({ json: async () => ({ message: 'nope' }) }),
    })

    const caught = await caughtFrom({ path: '/api/auth/get-session' })

    expect(mocks.setResponseHeader).not.toHaveBeenCalled()
    expect(mocks.appendResponseHeader).toHaveBeenCalledTimes(2)
    expect(caught).toBeInstanceOf(DomainFailure)
  })

  it('tolerates a headers object without getSetCookie', async () => {
    mocks.toWebRequest.mockReturnValue(request('/api/auth/get-session'))
    mocks.handler.mockResolvedValue({
      status: 403,
      headers: { get: () => undefined },
      clone: () => ({ json: async () => ({ message: 'nope' }) }),
    })

    const caught = await caughtFrom({ path: '/api/auth/get-session' })

    expect(mocks.appendResponseHeader).not.toHaveBeenCalled()
    expect((caught as DomainFailure).error).toBe('forbidden')
  })

  it('keeps a cookie session but removes the bearer token for a browser origin', async () => {
    mocks.toWebRequest.mockReturnValue(request('/api/auth/get-session', {
      headers: { origin: 'https://app.example.com' },
    }))
    mocks.handler.mockResolvedValue(sessionResponse())

    const response = await route({ path: '/api/auth/get-session' }) as Response

    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('set-auth-token')).toBeNull()
    expect(response.headers.get('access-control-expose-headers')).toBeNull()
    await expect(response.text()).resolves.toBe('{"session":true}')
  })

  it('keeps the bearer token for the configured native origin', async () => {
    mocks.toWebRequest.mockReturnValue(request('/api/auth/get-session', {
      headers: { origin: 'capacitor://localhost' },
    }))
    mocks.handler.mockResolvedValue(sessionResponse())

    const response = await route({ path: '/api/auth/get-session' }) as Response

    expect(response.headers.get('set-auth-token')).toBe('secret')
    expect(response.headers.get('access-control-expose-headers')).toBe('set-auth-token')
  })
})
