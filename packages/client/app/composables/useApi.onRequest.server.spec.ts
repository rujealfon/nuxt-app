import { describe, expect, it, vi } from 'vitest'

// Captures the SSR client's `onRequest` hook so it can be driven directly,
// which is the only way to reach the Request-object and baseURL-fallback arms.
const mocks = vi.hoisted(() => ({
  apiFn: vi.fn(),
  created: { current: undefined as undefined | Record<string, unknown> },
}))

vi.mock('#imports', () => ({
  $fetch: {
    create: (options: Record<string, unknown>) => {
      mocks.created.current = options
      return mocks.apiFn
    },
  },
  useRuntimeConfig: () => ({
    public: { apiBase: 'https://api.test', apiVersion: 'v1', sessionTransport: 'cookie' },
  }),
  useRequestHeaders: () => ({ cookie: 'session=alice' }),
  createUseFetch: () => vi.fn(),
}))

const { useApi } = await import('./useApi')

describe('useApi SSR cookie forwarding', () => {
  it('forwards cookies for a Request object and falls back to the configured baseURL', () => {
    useApi()

    const onRequest = mocks.created.current?.onRequest as (context: {
      request: URL
      options: { baseURL?: string, headers: Headers }
    }) => void

    const headers = new Headers()
    onRequest({ request: new URL('https://api.test/api/v1/hello'), options: { baseURL: '', headers } })

    expect(headers.get('cookie')).toBe('session=alice')
  })
})
