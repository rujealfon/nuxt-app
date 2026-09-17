import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import authMiddleware from '../app/middleware/auth.global'

// Crosses the real package seam: the real `useAuth` (auto-imported from the
// layer) with only the network below the vendor client replaced.
let sessionPayload: unknown = null

const fetchMock = vi.fn(async (input: unknown) => {
  // The client may pass the URL as a String object; coerce before matching.
  const url = input instanceof Request ? input.url : String(input)
  if (url.endsWith('/get-session')) {
    return Response.json(sessionPayload)
  }
  return Response.json(null)
})

vi.stubGlobal('fetch', fetchMock)

const state = vi.hoisted(() => ({
  navigateTo: vi.fn(),
}))

mockNuxtImport('navigateTo', () => state.navigateTo)

function actorSession(role: string) {
  return {
    user: { id: 'user-1', email: 'user@example.com', name: null, role },
    session: { id: 'session-1' },
  }
}

beforeEach(() => {
  sessionPayload = null
  fetchMock.mockClear()
  state.navigateTo.mockReset()
})

describe('admin auth middleware', () => {
  it('skips the login route', async () => {
    await authMiddleware({ path: '/login', fullPath: '/login' } as never)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(state.navigateTo).not.toHaveBeenCalled()
  })

  it('redirects when there is no actor', async () => {
    await authMiddleware({ path: '/', fullPath: '/' } as never)

    expect(state.navigateTo).toHaveBeenCalledWith({ path: '/login', query: { redirect: '/' } })
  })

  it('redirects non-admin actors', async () => {
    sessionPayload = actorSession('user')

    await authMiddleware({ path: '/', fullPath: '/' } as never)

    expect(state.navigateTo).toHaveBeenCalled()
  })

  it('allows admins through', async () => {
    sessionPayload = actorSession('admin')

    await authMiddleware({ path: '/', fullPath: '/' } as never)

    expect(state.navigateTo).not.toHaveBeenCalled()
  })
})
