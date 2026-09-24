import type { SessionTransport } from './sessionTransport'
import { $fetch } from 'ofetch'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAuthTokenStore } from '../../test/helpers/authTokenStore'
import { readAuthToken, writeAuthToken } from './authToken'
import { createSessionTransport } from './sessionTransport'

const baseURL = 'https://api.test/api/v1'

function tokenResponse(headers: Record<string, string>) {
  return { response: new Response(null, { headers }) }
}

function requestContext(headers: HeadersInit = {}) {
  return {
    request: `${baseURL}/hello`,
    options: { baseURL, headers: new Headers(headers) },
  }
}

// ofetch accepts a single hook or an array of them; the transport always sets
// one, so the spec drives it directly.
function firstHook<T>(hook: T | T[] | undefined): T {
  return (Array.isArray(hook) ? hook[0] : hook) as T
}

async function sendVia(transport: SessionTransport, context: unknown) {
  await (firstHook(transport.apiClientOptions.onRequest) as (c: unknown) => Promise<void>)(context)
}

async function clearVia(transport: SessionTransport, status: number, headers: HeadersInit = {}) {
  await (firstHook(transport.apiClientOptions.onResponseError) as (c: unknown) => Promise<void>)({
    ...requestContext(headers),
    response: new Response(null, { status }),
  })
}

beforeEach(resetAuthTokenStore)

describe('createSessionTransport', () => {
  it('keys the client by origin and transport', () => {
    expect(createSessionTransport(baseURL, true).clientKey).toBe(`${baseURL}|bearer`)
    expect(createSessionTransport(baseURL, false).clientKey).toBe(`${baseURL}|cookie`)
  })
})

describe('authClientOptions', () => {
  it('keeps the cookie transport unchanged', () => {
    const options = createSessionTransport('https://api.test', false).authClientOptions

    expect(options.credentials).toBe('include')
    expect(options.auth).toBeUndefined()
    expect(options.onSuccess).toBeUndefined()
    expect(options.onError).toBeUndefined()
  })

  it('drops cookies and sends the token as a bearer header', async () => {
    await writeAuthToken('session-token')

    const options = createSessionTransport('https://api.test', true).authClientOptions
    const token = options.auth?.type === 'Bearer' ? options.auth.token : undefined

    expect(options.credentials).toBe('omit')
    expect(options.auth?.type).toBe('Bearer')
    expect(typeof token).toBe('function')
    await expect((token as () => Promise<string>)()).resolves.toBe('session-token')
  })

  it('sends an empty token before sign-in', async () => {
    const auth = createSessionTransport('https://api.test', true).authClientOptions.auth
    const token = auth?.type === 'Bearer' ? auth.token : undefined

    expect(typeof token).toBe('function')
    await expect((token as () => Promise<string>)()).resolves.toBe('')
  })

  it('persists the token handed back on a successful response', async () => {
    await createSessionTransport('https://api.test', true)
      .authClientOptions
      .onSuccess?.(tokenResponse({ 'set-auth-token': 'issued-token' }) as never)

    await expect(readAuthToken()).resolves.toBe('issued-token')
  })

  it('leaves a stored token alone when the response carries none', async () => {
    await writeAuthToken('session-token')

    await createSessionTransport('https://api.test', true).authClientOptions.onSuccess?.(tokenResponse({}) as never)

    await expect(readAuthToken()).resolves.toBe('session-token')
  })
})

describe('apiClientOptions', () => {
  it('keeps cookies in cookie mode', () => {
    const options = createSessionTransport(baseURL, false).apiClientOptions

    expect(options.credentials).toBe('include')
    expect(options.onRequest).toBeUndefined()
    expect(options.onResponseError).toBeUndefined()
  })

  it('omits cookies and wires the bearer handlers in bearer mode', () => {
    const options = createSessionTransport(baseURL, true).apiClientOptions

    expect(options.credentials).toBe('omit')
    expect(typeof options.onRequest).toBe('function')
    expect(typeof options.onResponseError).toBe('function')
  })

  it('signs a configured-origin request and keeps caller headers', async () => {
    await writeAuthToken('session-token')
    const context = requestContext({ 'x-trace': 'abc' })

    await sendVia(createSessionTransport(baseURL, true), context)

    expect(context.options.headers.get('x-trace')).toBe('abc')
    expect(context.options.headers.get('Authorization')).toBe('Bearer session-token')
  })

  it('sends no header before sign-in', async () => {
    const context = requestContext()

    await sendVia(createSessionTransport(baseURL, true), context)

    expect(context.options.headers.get('Authorization')).toBeNull()
  })

  it('drops the stored token when the API answers 401', async () => {
    await writeAuthToken('session-token')

    await clearVia(createSessionTransport(baseURL, true), 401, { authorization: 'Bearer session-token' })

    await expect(readAuthToken()).resolves.toBeNull()
  })

  it('keeps the stored token on any other status', async () => {
    await writeAuthToken('session-token')

    await clearVia(createSessionTransport(baseURL, true), 500, { authorization: 'Bearer session-token' })

    await expect(readAuthToken()).resolves.toBe('session-token')
  })

  it('preserves a new session when an old request returns 401', async () => {
    await writeAuthToken('new-session')

    await clearVia(createSessionTransport(baseURL, true), 401, { authorization: 'Bearer old-session' })

    await expect(readAuthToken()).resolves.toBe('new-session')
  })

  it('preserves a session when the failed request had no token', async () => {
    await writeAuthToken('session-token')

    await clearVia(createSessionTransport(baseURL, true), 401)

    await expect(readAuthToken()).resolves.toBe('session-token')
  })

  it('keeps a newer token when a versioned-route request returns a late 401', async () => {
    await writeAuthToken('old-session')
    const started = Promise.withResolvers<void>()
    const response = Promise.withResolvers<Response>()
    const fetch = vi.fn(() => {
      started.resolve()
      return response.promise
    })
    const transport = createSessionTransport(baseURL, true)
    const api = $fetch.create({ ...transport.apiClientOptions, baseURL, retry: 0 }, { fetch })

    const failure = expect(api(`${baseURL}/hello`)).rejects.toThrow()
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
    const transport = createSessionTransport(baseURL, true)
    const api = $fetch.create({ baseURL, ...transport.apiClientOptions }, { fetch })

    await api('/same-origin')
    await api('https://other.test/absolute')
    await api('/overridden', { baseURL: 'https://other.test' })

    expect(authorizations).toEqual([
      'Bearer session-token',
      null,
      null,
    ])
  })

  it('signs a configured-origin request passed as a Request', async () => {
    await writeAuthToken('session-token')
    const authorizations: Array<string | null> = []
    const fetch = vi.fn(async (_request: RequestInfo | URL, init?: RequestInit) => {
      authorizations.push(new Headers(init?.headers).get('authorization'))
      return new Response('{}', { headers: { 'content-type': 'application/json' } })
    })
    const transport = createSessionTransport(baseURL, true)
    const api = $fetch.create({ baseURL, ...transport.apiClientOptions }, { fetch })

    await api(new Request(`${baseURL}/hello`))

    expect(authorizations).toEqual(['Bearer session-token'])
  })

  it('does not clear the stored token after a foreign-origin 401', async () => {
    await writeAuthToken('session-token')
    const fetch = vi.fn(async () => new Response(null, { status: 401 }))
    const transport = createSessionTransport(baseURL, true)
    const api = $fetch.create({ ...transport.apiClientOptions, baseURL, retry: 0 }, { fetch })

    await expect(api('https://other.test/protected', {
      headers: { authorization: 'Bearer session-token' },
    })).rejects.toThrow()

    await expect(readAuthToken()).resolves.toBe('session-token')
  })
})

describe('isConfiguredOrigin', () => {
  it('matches only the configured origin', () => {
    const transport = createSessionTransport(baseURL, true)

    expect(transport.isConfiguredOrigin(`${baseURL}/hello`, undefined)).toBe(true)
    expect(transport.isConfiguredOrigin(new Request(`${baseURL}/hello`), undefined)).toBe(true)
    expect(transport.isConfiguredOrigin('https://other.test/hello', undefined)).toBe(false)
    expect(transport.isConfiguredOrigin('/hello', 'https://other.test')).toBe(false)
  })
})
