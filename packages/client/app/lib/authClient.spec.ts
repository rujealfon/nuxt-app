import { createAuthClient } from 'better-auth/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAuthTokenStore } from '../../test/helpers/authTokenStore'
import { readAuthToken } from './authToken'
import { authFetchOptions } from './authTransport'

// Unlike the other specs, this drives the REAL better-auth client with a
// stubbed `fetch`. It is the only check that the `auth`/`onSuccess` options
// `authFetchOptions` returns are the shape the installed client actually reads.

const fetchMock = vi.fn()

function jsonResponse(body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function errorResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function requestOf(call: unknown[]) {
  const [input, init] = call as [RequestInfo | URL, RequestInit | undefined]

  if (input instanceof Request) {
    return { headers: input.headers, credentials: input.credentials }
  }

  return { headers: new Headers(init?.headers), credentials: init?.credentials }
}

async function signedInClient() {
  fetchMock.mockResolvedValueOnce(
    jsonResponse({ token: 'x', user: { id: 'user-1' } }, { 'set-auth-token': 'issued-token' }),
  )

  const client = createAuthClient({
    baseURL: 'http://api.test',
    fetchOptions: authFetchOptions(true),
  })

  await client.signIn.email({ email: 'user@example.com', password: 'secret' })

  return client
}

beforeEach(async () => {
  await resetAuthTokenStore()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('bearer transport against the real better-auth client', () => {
  it('omits cookies and persists the issued token', async () => {
    await signedInClient()

    const request = requestOf(fetchMock.mock.calls[0]!)

    expect(request.credentials).toBe('omit')
    await expect(readAuthToken()).resolves.toBe('issued-token')
  })

  it('attaches the stored token as a bearer header on later requests', async () => {
    const client = await signedInClient()

    fetchMock.mockResolvedValueOnce(jsonResponse(null))
    await client.getSession()

    const request = requestOf(fetchMock.mock.calls.at(-1)!)

    expect(request.headers.get('authorization')).toBe('Bearer issued-token')
    expect(request.credentials).toBe('omit')
  })

  it('clears a stale token when the auth client receives a 401', async () => {
    const client = await signedInClient()

    fetchMock.mockResolvedValueOnce(errorResponse(401, { message: 'Unauthorized' }))
    await client.getSession()

    await expect(readAuthToken()).resolves.toBeNull()
  })
})
