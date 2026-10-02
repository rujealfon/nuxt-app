import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DomainFailure } from '../../utils/domain-failure'

const mocks = vi.hoisted(() => {
  const handler = vi.fn()

  return {
    handler,
    toWebRequest: vi.fn(),
    readAuthBody: vi.fn(),
    consume: vi.fn(),
    getRequestIP: vi.fn(() => '192.0.2.10' as string | undefined),
    setResponseHeader: vi.fn(),
    appendResponseHeader: vi.fn(),
    useAuth: vi.fn(() => ({ handler })),
    config: {
      rateLimitEnabled: false,
      authBearerEnabled: true,
      authBearerOrigins: 'capacitor://localhost',
    },
  }
})

vi.mock('h3', () => ({
  getRequestURL: (event: { method: string, headers: Headers }) => {
    const request = mocks.toWebRequest() as Request
    event.method = request.method
    event.headers = request.headers
    return new URL(request.url)
  },
  getRequestIP: mocks.getRequestIP,
  setResponseHeader: mocks.setResponseHeader,
  appendResponseHeader: mocks.appendResponseHeader,
}))

vi.mock('nitropack/runtime', () => ({ useRuntimeConfig: () => mocks.config }))
vi.mock('../../utils/auth', () => ({ useAuth: mocks.useAuth }))
vi.mock('../../utils/rate-limit', () => ({ createRateLimitStorage: () => ({ consume: mocks.consume }) }))
vi.mock('./read-auth-body', () => ({ readAuthBody: mocks.readAuthBody, closeAuthUpload: vi.fn() }))

const { handleAuthRequest } = await import('./handle-auth-request')

function caughtFrom(event: unknown): Promise<unknown> {
  return handleAuthRequest(event as never).then(() => undefined, (error: unknown) => error)
}

function request(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, init)
}

function sessionResponse() {
  return new Response(JSON.stringify({
    session: { id: 'session-1', token: 'session-secret', userId: 'user-1' },
    user: { id: 'user-1' },
  }), {
    headers: {
      'content-type': 'application/json',
      'set-cookie': 'better-auth.session_token=session-secret; HttpOnly; Path=/',
      'set-auth-token': 'session-secret',
      'access-control-expose-headers': 'set-auth-token',
    },
  })
}

describe('handleAuthRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.config.rateLimitEnabled = false
    mocks.getRequestIP.mockReturnValue('192.0.2.10')
    mocks.readAuthBody.mockImplementation(async (event) => {
      const original = mocks.toWebRequest() as Request
      event.method = original.method
      event.headers = original.headers
      return new Uint8Array(await original.clone().arrayBuffer())
    })
  })

  it('preserves valid registration bytes, optional fields and credentials when delegating', async () => {
    const payload = { name: 'Example User', email: 'user@example.com', password: 'password123', callbackURL: 'https://app.example.com/welcome', rememberMe: false }
    mocks.toWebRequest.mockReturnValue(request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'origin': 'capacitor://localhost', 'cookie': 'existing=value' },
      body: JSON.stringify(payload),
    }))
    mocks.handler.mockResolvedValue(new Response(null))
    await handleAuthRequest({ path: '/api/auth/sign-up/email' } as never)
    const delegated = mocks.handler.mock.calls[0]![0] as Request
    expect(delegated.method).toBe('POST')
    expect(delegated.headers.get('cookie')).toBe('existing=value')
    expect(delegated.headers.get('origin')).toBe('capacitor://localhost')
    await expect(delegated.text()).resolves.toBe(JSON.stringify(payload))
  })

  it('uses one fallback IP budget and denies before reading the password body', async () => {
    mocks.config.rateLimitEnabled = true
    mocks.getRequestIP.mockReturnValue(undefined)
    mocks.toWebRequest.mockReturnValue(request('/api/auth/sign-in/email', { method: 'POST', body: '{}' }))
    mocks.consume.mockResolvedValue({ allowed: false, retryAfter: 60 })
    const caught = await caughtFrom({ path: '/api/auth/sign-in/email' })
    expect((caught as DomainFailure).error).toBe('rate_limited')
    expect(mocks.consume).toHaveBeenCalledWith('unknown:auth-prevalidation', { window: 60, max: 100 })
    expect(mocks.readAuthBody).not.toHaveBeenCalled()
    expect(mocks.handler).not.toHaveBeenCalled()
  })

  it('uses a zero Retry-After when a denied password request has no retry hint', async () => {
    mocks.config.rateLimitEnabled = true
    mocks.toWebRequest.mockReturnValue(request('/api/auth/sign-in/email', { method: 'POST', body: '{}' }))
    mocks.consume.mockResolvedValue({ allowed: false, retryAfter: null })
    const event = { path: '/api/auth/sign-in/email' }

    const caught = await caughtFrom(event)

    expect((caught as DomainFailure).error).toBe('rate_limited')
    expect(mocks.setResponseHeader).toHaveBeenCalledWith(event, 'retry-after', 0)
    expect(mocks.readAuthBody).not.toHaveBeenCalled()
    expect(mocks.handler).not.toHaveBeenCalled()
  })

  it('replaces a caller-supplied private IP header without changing credentials or the original request', async () => {
    const original = request('/api/auth/ok', {
      headers: {
        'x-auth-client-ip': '198.51.100.1',
        'x-forwarded-for': '198.51.100.2',
        'authorization': 'Bearer session-secret',
        'cookie': 'better-auth.session_token=session-secret',
        'origin': 'capacitor://localhost',
      },
    })
    mocks.toWebRequest.mockReturnValue(original)
    mocks.handler.mockResolvedValue(new Response(null))
    await handleAuthRequest({ path: '/api/auth/ok' } as never)
    const delegated = mocks.handler.mock.calls[0]![0] as Request
    expect(delegated.headers.get('x-auth-client-ip')).toBe('192.0.2.10')
    expect(delegated.headers.get('authorization')).toBe('Bearer session-secret')
    expect(delegated.headers.get('cookie')).toContain('session-secret')
    expect(delegated.headers.get('origin')).toBe('capacitor://localhost')
    expect(original.headers.get('x-auth-client-ip')).toBe('198.51.100.1')
  })

  it('removes a spoofed identity when the runtime cannot resolve an address', async () => {
    mocks.getRequestIP.mockReturnValue(undefined)
    mocks.toWebRequest.mockReturnValue(request('/api/auth/ok', {
      headers: { 'x-auth-client-ip': '198.51.100.1' },
    }))
    mocks.handler.mockResolvedValue(new Response(null))
    await handleAuthRequest({ path: '/api/auth/ok' } as never)
    const delegated = mocks.handler.mock.calls[0]![0] as Request
    expect(delegated.headers.has('x-auth-client-ip')).toBe(false)
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

    await expect(handleAuthRequest({ path: '/api/auth/sign-in/email' } as never)).resolves.toBe(response)
    expect(mocks.handler).toHaveBeenCalledWith(expect.any(Request))
  })

  it('returns the Better Auth response on success', async () => {
    mocks.toWebRequest.mockReturnValue(request('/api/auth/get-session'))
    const response = new Response(JSON.stringify({ session: null }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
    mocks.handler.mockResolvedValue(response)

    await expect(handleAuthRequest({ path: '/api/auth/get-session' } as never)).resolves.toBe(response)
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

    const response = await handleAuthRequest({ path: '/api/auth/get-session' } as never) as Response

    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('set-auth-token')).toBeNull()
    expect(response.headers.get('access-control-expose-headers')).toBeNull()
    await expect(response.json()).resolves.toEqual({
      session: { id: 'session-1', userId: 'user-1' },
      user: { id: 'user-1' },
    })
  })

  it('keeps the bearer token for the configured native origin', async () => {
    mocks.toWebRequest.mockReturnValue(request('/api/auth/get-session', {
      headers: { origin: 'capacitor://localhost' },
    }))
    mocks.handler.mockResolvedValue(sessionResponse())

    const response = await handleAuthRequest({ path: '/api/auth/get-session' } as never) as Response

    expect(response.headers.get('set-auth-token')).toBe('session-secret')
    expect(response.headers.get('access-control-expose-headers')).toBe('set-auth-token')
    await expect(response.json()).resolves.toEqual({
      session: { id: 'session-1', token: 'session-secret', userId: 'user-1' },
      user: { id: 'user-1' },
    })
  })

  it('removes the body token when a same-origin request has no Origin header', async () => {
    mocks.toWebRequest.mockReturnValue(request('/api/auth/get-session'))
    mocks.handler.mockResolvedValue(sessionResponse())

    const response = await handleAuthRequest({ path: '/api/auth/get-session' } as never) as Response

    await expect(response.json()).resolves.toEqual({
      session: { id: 'session-1', userId: 'user-1' },
      user: { id: 'user-1' },
    })
  })

  it('keeps a null sign-up token and user data', async () => {
    const path = '/api/auth/sign-up/email'
    const payload = { token: null, user: { id: 'user-1' } }
    mocks.toWebRequest.mockReturnValue(request(path, { headers: { origin: 'https://app.example.com' } }))
    const original = new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } })
    mocks.handler.mockResolvedValue(original)

    await expect(handleAuthRequest({ path } as never)).resolves.toBe(original)
  })

  it('preserves a social sign-in redirect without parsing it as JSON', async () => {
    const path = '/api/auth/sign-in/social'
    mocks.toWebRequest.mockReturnValue(request(path, { headers: { origin: 'https://app.example.com' } }))
    const original = new Response(null, { status: 302, headers: { location: 'https://idp.example.com' } })
    mocks.handler.mockResolvedValue(original)

    await expect(handleAuthRequest({ path } as never)).resolves.toBe(original)
  })

  it('keeps the JSON body for a non-session auth response', async () => {
    const path = '/api/auth/verify-email'
    const payload = { status: true, token: 'other-token' }
    mocks.toWebRequest.mockReturnValue(request(path, { headers: { origin: 'https://app.example.com' } }))
    mocks.handler.mockResolvedValue(new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } }))

    const response = await handleAuthRequest({ path } as never) as Response

    await expect(response.json()).resolves.toEqual(payload)
  })

  it.each([
    ['/api/auth/sign-in/email', { redirect: false, token: 'session-secret', user: { id: 'user-1' } }, { redirect: false, user: { id: 'user-1' } }],
    ['/api/auth/sign-up/email', { token: 'session-secret', user: { id: 'user-1' } }, { user: { id: 'user-1' } }],
    ['/api/auth/sign-in/social', { redirect: false, token: 'session-secret', user: { id: 'user-1' } }, { redirect: false, user: { id: 'user-1' } }],
    ['/api/auth/change-password', { token: 'session-secret', user: { id: 'user-1' } }, { user: { id: 'user-1' } }],
    ['/api/auth/list-sessions', [{ id: 'session-1', token: 'session-secret' }, { id: 'session-2', token: 'other-secret' }], [{ id: 'session-1' }, { id: 'session-2' }]],
    ['/api/auth/update-session', { session: { id: 'session-1', token: 'session-secret' } }, { session: { id: 'session-1' } }],
  ] as const)('removes session tokens from %s for a browser origin', async (path, payload, expected) => {
    mocks.toWebRequest.mockReturnValue(request(path, { headers: { origin: 'https://app.example.com' } }))
    mocks.handler.mockResolvedValue(new Response(JSON.stringify(payload), {
      headers: { 'content-type': 'application/json' },
    }))

    const response = await handleAuthRequest({ path } as never) as Response

    await expect(response.json()).resolves.toEqual(expected)
  })
})

describe('authentication rate-limit boundary', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('keeps rotating forged forwarding headers in one budget and permits another real client', async () => {
    vi.stubEnv('VERCEL', '')
    const { createAuth } = await import('../../database/auth')
    const counts = new Map<string, number>()
    const consume = vi.fn(async (key: string, rule: { max: number }) => {
      const count = (counts.get(key) ?? 0) + 1
      counts.set(key, count)
      return { allowed: count <= rule.max, retryAfter: count > rule.max ? 10 : null }
    })
    const auth = createAuth({} as never, {
      secret: 'test-secret-test-secret-test-secret',
      baseURL: 'http://localhost',
      trustedOrigins: ['http://localhost'],
      rateLimitStorage: { consume },
    })
    mocks.handler.mockImplementation(auth.handler)
    mocks.getRequestIP.mockReturnValue('203.0.113.7')
    const attempt = async (forged: string) => {
      mocks.toWebRequest.mockReturnValue(request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'origin': 'http://localhost',
          'content-type': 'application/x-www-form-urlencoded',
          'x-forwarded-for': forged,
          'x-auth-client-ip': forged,
        },
        body: 'email=invalid&password=invalid',
      }))
      return caughtFrom({ path: '/api/auth/sign-in/email' })
    }
    for (let i = 1; i <= 3; i++) {
      expect((await attempt(`198.51.100.${i}`) as DomainFailure).error).toBe('unauthenticated')
    }
    expect((await attempt('198.51.100.4') as DomainFailure).error).toBe('rate_limited')
    expect(counts.size).toBe(1)
    expect(mocks.getRequestIP).toHaveBeenCalledWith(expect.anything(), { xForwardedFor: false })

    mocks.getRequestIP.mockReturnValue('203.0.113.8')
    expect((await attempt('198.51.100.5') as DomainFailure).error).toBe('unauthenticated')
    expect(counts.size).toBe(2)
  })
})
