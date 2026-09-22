import { beforeEach, describe, expect, it } from 'vitest'
import { browserAuthTokenStore, readAuthToken, setAuthTokenStore, writeAuthToken } from './authToken'
import { authFetchOptions, setBearerAuthorization } from './authTransport'

function tokenResponse(headers: Record<string, string>) {
  return { response: new Response(null, { headers }) }
}

function requestContext() {
  return { options: {} as { headers?: HeadersInit } }
}

beforeEach(async () => {
  setAuthTokenStore(browserAuthTokenStore)
  await browserAuthTokenStore.clear()
})

describe('authFetchOptions', () => {
  it('keeps the cookie transport unchanged', () => {
    const options = authFetchOptions(false)

    expect(options.credentials).toBe('include')
    expect(options.auth).toBeUndefined()
    expect(options.onSuccess).toBeUndefined()
  })

  it('drops cookies and sends the token as a bearer header', async () => {
    await writeAuthToken('session-token')

    const options = authFetchOptions(true)

    expect(options.credentials).toBe('omit')
    expect(options.auth?.type).toBe('Bearer')
    await expect(options.auth?.token()).resolves.toBe('session-token')
  })

  it('sends an empty token before sign-in', async () => {
    await expect(authFetchOptions(true).auth?.token()).resolves.toBe('')
  })

  it('persists the token handed back on a successful response', async () => {
    await authFetchOptions(true).onSuccess?.(tokenResponse({ 'set-auth-token': 'issued-token' }))

    await expect(readAuthToken()).resolves.toBe('issued-token')
  })

  it('leaves a stored token alone when the response carries none', async () => {
    await writeAuthToken('session-token')

    await authFetchOptions(true).onSuccess?.(tokenResponse({}))

    await expect(readAuthToken()).resolves.toBe('session-token')
  })
})

describe('setBearerAuthorization', () => {
  it('signs a versioned-route request with the stored token', async () => {
    await writeAuthToken('session-token')
    const context = requestContext()

    await setBearerAuthorization(context)

    expect(new Headers(context.options.headers).get('Authorization')).toBe('Bearer session-token')
  })

  it('keeps headers a caller already set', async () => {
    await writeAuthToken('session-token')
    const context = { options: { headers: { 'x-trace': 'abc' } } }

    await setBearerAuthorization(context)

    const headers = new Headers(context.options.headers)
    expect(headers.get('x-trace')).toBe('abc')
    expect(headers.get('Authorization')).toBe('Bearer session-token')
  })

  it('sends no header before sign-in', async () => {
    const context = requestContext()

    await setBearerAuthorization(context)

    expect(context.options.headers).toBeUndefined()
  })
})
