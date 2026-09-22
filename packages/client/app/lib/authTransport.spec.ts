import { beforeEach, describe, expect, it } from 'vitest'
import { resetAuthTokenStore } from '../../test/helpers/authTokenStore'
import { readAuthToken, writeAuthToken } from './authToken'
import { apiFetchOptions, authFetchOptions, clearStaleBearer, setBearerAuthorization } from './authTransport'

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
    const options = apiFetchOptions(false)

    expect(options.credentials).toBe('include')
    expect(options.onRequest).toBeUndefined()
    expect(options.onResponseError).toBeUndefined()
  })

  it('omits cookies and wires the bearer handlers in bearer mode', () => {
    const options = apiFetchOptions(true)

    expect(options.credentials).toBe('omit')
    expect(typeof options.onRequest).toBe('function')
    expect(typeof options.onResponseError).toBe('function')
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

    await clearStaleBearer(401)

    await expect(readAuthToken()).resolves.toBeNull()
  })

  it('keeps the stored token on any other status', async () => {
    await writeAuthToken('session-token')

    await clearStaleBearer(500)

    await expect(readAuthToken()).resolves.toBe('session-token')
  })
})
