import { $fetch } from 'ofetch'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAuthTokenStore } from '../../test/helpers/authTokenStore'
import { readAuthToken, writeAuthToken } from './authToken'
import { apiClientKey, apiFetchOptions, authFetchOptions, clearStaleBearer, setBearerAuthorization } from './authTransport'

function tokenResponse(headers: Record<string, string>) {
  return { response: new Response(null, { headers }) }
}

function requestContext() {
  return {} as { headers?: HeadersInit }
}

beforeEach(resetAuthTokenStore)

describe('authFetchOptions', () => {
  it('keeps the cookie transport unchanged', () => {
    const options = authFetchOptions(false)

    expect(options.credentials).toBe('include')
    expect(options.auth).toBeUndefined()
    expect(options.onSuccess).toBeUndefined()
    expect(options.onError).toBeUndefined()
  })

  it('drops cookies and sends the token as a bearer header', async () => {
    await writeAuthToken('session-token')

    const options = authFetchOptions(true)
    const token = options.auth?.type === 'Bearer' ? options.auth.token : undefined

    expect(options.credentials).toBe('omit')
    expect(options.auth?.type).toBe('Bearer')
    expect(typeof token).toBe('function')
    await expect((token as () => Promise<string>)()).resolves.toBe('session-token')
  })

  it('sends an empty token before sign-in', async () => {
    const auth = authFetchOptions(true).auth
    const token = auth?.type === 'Bearer' ? auth.token : undefined

    expect(typeof token).toBe('function')
    await expect((token as () => Promise<string>)()).resolves.toBe('')
  })

  it('persists the token handed back on a successful response', async () => {
    await authFetchOptions(true).onSuccess?.(tokenResponse({ 'set-auth-token': 'issued-token' }) as never)

    await expect(readAuthToken()).resolves.toBe('issued-token')
  })

  it('leaves a stored token alone when the response carries none', async () => {
    await writeAuthToken('session-token')

    await authFetchOptions(true).onSuccess?.(tokenResponse({}) as never)

    await expect(readAuthToken()).resolves.toBe('session-token')
  })
})

describe('apiFetchOptions', () => {
  it('keeps cookies in cookie mode', () => {
    const options = apiFetchOptions('https://api.test/api/v1', false)

    expect(options.credentials).toBe('include')
    expect(options.onRequest).toBeUndefined()
    expect(options.onResponseError).toBeUndefined()
  })

  it('omits cookies and wires the bearer handlers in bearer mode', () => {
    const options = apiFetchOptions('https://api.test/api/v1', true)

    expect(options.credentials).toBe('omit')
    expect(typeof options.onRequest).toBe('function')
    expect(typeof options.onResponseError).toBe('function')
  })

  it('keeps a newer token when a versioned-route request returns a late 401', async () => {
    await writeAuthToken('old-session')
    const started = Promise.withResolvers<void>()
    const response = Promise.withResolvers<Response>()
    const fetch = vi.fn(() => {
      started.resolve()
      return response.promise
    })
    const api = $fetch.create({ ...apiFetchOptions('http://api.test/api/v1', true), retry: 0 }, { fetch })

    const failure = expect(api('http://api.test/api/v1/hello')).rejects.toThrow()
    await started.promise
    await writeAuthToken('new-session')
    response.resolve(new Response(null, { status: 401 }))
    await failure

    await expect(readAuthToken()).resolves.toBe('new-session')
  })

  it('only sends the stored token to the configured API origin', async () => {
    await writeAuthToken('session-token')
    const authorizations: Array<string | null> = []
    const fetch = vi.fn(async (_request: RequestInfo | URL, init?: RequestInit) => {
      authorizations.push(new Headers(init?.headers).get('authorization'))
      return new Response('{}', { headers: { 'content-type': 'application/json' } })
    })
    const baseURL = 'https://api.test/api/v1'
    const api = $fetch.create({ baseURL, ...apiFetchOptions(baseURL, true) }, { fetch })

    await api('/same-origin')
    await api('https://other.test/absolute')
    await api('/overridden', { baseURL: 'https://other.test' })

    expect(authorizations).toEqual([
      'Bearer session-token',
      null,
      null,
    ])
  })

  it('does not clear the stored token after a foreign-origin 401', async () => {
    await writeAuthToken('session-token')
    const fetch = vi.fn(async () => new Response(null, { status: 401 }))
    const baseURL = 'https://api.test/api/v1'
    const api = $fetch.create({ baseURL, ...apiFetchOptions(baseURL, true), retry: 0 }, { fetch })

    await expect(api('https://other.test/protected', {
      headers: { authorization: 'Bearer session-token' },
    })).rejects.toThrow()

    await expect(readAuthToken()).resolves.toBe('session-token')
  })
})

describe('setBearerAuthorization', () => {
  it('signs a versioned-route request with the stored token', async () => {
    await writeAuthToken('session-token')
    const context = requestContext()

    await setBearerAuthorization(context)

    expect(new Headers(context.headers).get('Authorization')).toBe('Bearer session-token')
  })

  it('keeps headers a caller already set', async () => {
    await writeAuthToken('session-token')
    const context = { headers: { 'x-trace': 'abc' } as HeadersInit }

    await setBearerAuthorization(context)

    const headers = new Headers(context.headers)
    expect(headers.get('x-trace')).toBe('abc')
    expect(headers.get('Authorization')).toBe('Bearer session-token')
  })

  it('sends no header before sign-in', async () => {
    const context = requestContext()

    await setBearerAuthorization(context)

    expect(context.headers).toBeUndefined()
  })
})

describe('clearStaleBearer', () => {
  it('drops the stored token when the API answers 401', async () => {
    await writeAuthToken('session-token')

    await clearStaleBearer(401, { authorization: 'Bearer session-token' })

    await expect(readAuthToken()).resolves.toBeNull()
  })

  it('keeps the stored token on any other status', async () => {
    await writeAuthToken('session-token')

    await clearStaleBearer(500, { authorization: 'Bearer session-token' })

    await expect(readAuthToken()).resolves.toBe('session-token')
  })

  it('preserves a new session when an old request returns 401', async () => {
    await writeAuthToken('new-session')

    await clearStaleBearer(401, { authorization: 'Bearer old-session' })

    await expect(readAuthToken()).resolves.toBe('new-session')
  })

  it('preserves a session when the failed request had no token', async () => {
    await writeAuthToken('session-token')

    await clearStaleBearer(401)

    await expect(readAuthToken()).resolves.toBe('session-token')
  })
})

describe('apiClientKey', () => {
  it('distinguishes the bearer and cookie transports', () => {
    expect(apiClientKey('https://api.test/api/v1', true)).toBe('https://api.test/api/v1|bearer')
    expect(apiClientKey('https://api.test/api/v1', false)).toBe('https://api.test/api/v1|cookie')
  })
})
