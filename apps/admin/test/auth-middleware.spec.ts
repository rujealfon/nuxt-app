import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import authMiddleware from '../app/middleware/auth.global'

const state = vi.hoisted(() => ({
  getActor: vi.fn(),
  navigateTo: vi.fn(),
}))

mockNuxtImport('useAuth', () => () => ({ getActor: state.getActor }))
mockNuxtImport('navigateTo', () => state.navigateTo)

beforeEach(() => {
  state.getActor.mockReset()
  state.navigateTo.mockReset()
})

describe('admin auth middleware', () => {
  it('skips the login route', async () => {
    await authMiddleware({ path: '/login', fullPath: '/login' } as never)

    expect(state.getActor).not.toHaveBeenCalled()
    expect(state.navigateTo).not.toHaveBeenCalled()
  })

  it('redirects when there is no actor', async () => {
    state.getActor.mockResolvedValue(null)

    await authMiddleware({ path: '/', fullPath: '/' } as never)

    expect(state.navigateTo).toHaveBeenCalledWith({ path: '/login', query: { redirect: '/' } })
  })

  it('redirects non-admin actors', async () => {
    state.getActor.mockResolvedValue({ id: 'user-1', role: 'user' })

    await authMiddleware({ path: '/', fullPath: '/' } as never)

    expect(state.navigateTo).toHaveBeenCalled()
  })

  it('allows admins through', async () => {
    state.getActor.mockResolvedValue({ id: 'user-1', role: 'admin' })

    await authMiddleware({ path: '/', fullPath: '/' } as never)

    expect(state.navigateTo).not.toHaveBeenCalled()
  })
})
