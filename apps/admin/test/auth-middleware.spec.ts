import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import authMiddleware from '../app/middleware/auth.global'

const state = vi.hoisted(() => ({
  getSession: vi.fn(),
  navigateTo: vi.fn(),
}))

mockNuxtImport('useAuthClient', () => () => ({ getSession: state.getSession }))
mockNuxtImport('navigateTo', () => state.navigateTo)

beforeEach(() => {
  state.getSession.mockReset()
  state.navigateTo.mockReset()
})

describe('admin auth middleware', () => {
  it('skips the login route', async () => {
    await authMiddleware({ path: '/login', fullPath: '/login' } as never)

    expect(state.getSession).not.toHaveBeenCalled()
    expect(state.navigateTo).not.toHaveBeenCalled()
  })

  it('redirects when there is no session', async () => {
    state.getSession.mockResolvedValue({ data: null })

    await authMiddleware({ path: '/', fullPath: '/' } as never)

    expect(state.navigateTo).toHaveBeenCalledWith({ path: '/login', query: { redirect: '/' } })
  })

  it('redirects non-admin users', async () => {
    state.getSession.mockResolvedValue({ data: { user: { role: 'user' } } })

    await authMiddleware({ path: '/', fullPath: '/' } as never)

    expect(state.navigateTo).toHaveBeenCalled()
  })

  it('allows admins through', async () => {
    state.getSession.mockResolvedValue({ data: { user: { role: 'admin' } } })

    await authMiddleware({ path: '/', fullPath: '/' } as never)

    expect(state.navigateTo).not.toHaveBeenCalled()
  })
})
