import { $fetch } from 'ofetch'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useApi, useApiFetch } from './useApi'

const request = vi.hoisted(() => ({ cookie: '', transport: 'cookie' }))
const fetchMock = vi.hoisted(() => vi.fn())

// Exercise the actual ofetch client with separate incoming SSR cookies.
vi.mock('#imports', () => ({
  $fetch: $fetch.create({}, { fetch: fetchMock }),
  useRuntimeConfig: () => ({
    public: { apiBase: 'https://api.test', apiVersion: 'v1', sessionTransport: request.transport },
  }),
  useRequestHeaders: () => ({ cookie: request.cookie }),
  createUseFetch: (options: (callerOptions: object) => { $fetch: typeof $fetch }) =>
    (path: string) => options({}).$fetch(path),
}))

beforeEach(() => {
  request.cookie = ''
  request.transport = 'cookie'
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => new Response('{}', { headers: { 'content-type': 'application/json' } }))
})

function sentCookies() {
  return fetchMock.mock.calls.map(([, options]) => new Headers(options.headers).get('cookie'))
}

describe('server-side API authentication', () => {
  it('forwards the incoming cookie through useApiFetch', async () => {
    request.cookie = 'session=alice'

    await useApiFetch('/hello')

    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/api/v1/hello')
    expect(sentCookies()).toEqual(['session=alice'])
  })

  it('keeps concurrent SSR requests isolated', async () => {
    request.cookie = 'session=alice'
    const alice = useApi().api
    request.cookie = 'session=bob'
    const bob = useApi().api
    request.cookie = ''
    const anonymous = useApi().api

    await Promise.all([alice('/alice'), bob('/bob'), anonymous('/anonymous')])

    expect(Object.fromEntries(fetchMock.mock.calls.map(([url, options]) => [
      new URL(url).pathname,
      new Headers(options.headers).get('cookie'),
    ]))).toEqual({
      '/api/v1/alice': 'session=alice',
      '/api/v1/bob': 'session=bob',
      '/api/v1/anonymous': null,
    })
  })

  it('does not forward incoming cookies to another origin', async () => {
    request.cookie = 'session=alice'
    const { api } = useApi()

    await api('https://other.test/hello')
    await api('/hello', { baseURL: 'https://other.test' })

    expect(sentCookies()).toEqual([null, null])
  })

  it('does not forward cookies in bearer transport', async () => {
    request.cookie = 'session=alice'
    request.transport = 'bearer'

    await useApiFetch('/hello')

    expect(sentCookies()).toEqual([null])
    expect(fetchMock.mock.calls[0]![1].credentials).toBe('omit')
  })
})
