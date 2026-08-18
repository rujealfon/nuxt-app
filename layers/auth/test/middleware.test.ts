import type { AuthUser } from '@nuxt-app/types'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import adminMiddleware from '../app/middleware/admin'
import authMiddleware from '../app/middleware/auth'
import guestMiddleware from '../app/middleware/guest'
import guestAdminMiddleware from '../app/middleware/guest-admin'

const { getUser, setUser, fetchUser, navigateTo } = vi.hoisted(() => {
  let user: AuthUser | null = null
  return {
    getUser: () => user,
    setUser: (next: AuthUser | null) => {
      user = next
    },
    fetchUser: vi.fn(async () => user),
    navigateTo: vi.fn((to: unknown) => to),
  }
})

mockNuxtImport('useAuth', () => () => ({
  user: { get value() {
    return getUser()
  } },
  fetchUser,
}))

mockNuxtImport('navigateTo', () => navigateTo)

const to = {
  fullPath: '/secret',
  path: '/secret',
  query: {},
  hash: '',
  name: 'index',
  params: {},
  matched: [],
  meta: {},
} as never

describe('auth middleware', () => {
  beforeEach(() => {
    setUser(null)
    fetchUser.mockClear()
    navigateTo.mockClear()
  })

  it('sends guests to login with a redirect back', async () => {
    const result = await authMiddleware(to, to)
    expect(fetchUser).toHaveBeenCalled()
    expect(result).toEqual({
      path: '/login',
      query: { redirect: '/secret' },
    })
  })

  it('lets an authenticated user through', async () => {
    setUser({ id: 'u1', email: 'a@b.c', name: 'Ada', role: 'user' })
    const result = await authMiddleware(to, to)
    expect(result).toBeUndefined()
    expect(navigateTo).not.toHaveBeenCalled()
  })
})

describe('guest middleware', () => {
  beforeEach(() => {
    setUser(null)
    fetchUser.mockClear()
    navigateTo.mockClear()
  })

  it('lets a guest through', async () => {
    const result = await guestMiddleware(to, to)
    expect(result).toBeUndefined()
  })

  it('sends a signed-in user home', async () => {
    setUser({ id: 'u1', email: 'a@b.c', name: 'Ada', role: 'user' })
    const result = await guestMiddleware(to, to)
    expect(result).toBe('/')
  })
})

describe('guest-admin middleware', () => {
  beforeEach(() => {
    setUser(null)
    fetchUser.mockClear()
    navigateTo.mockClear()
  })

  it('lets a guest through', async () => {
    const result = await guestAdminMiddleware(to, to)
    expect(result).toBeUndefined()
  })

  it('lets a signed-in non-admin through so they can switch accounts', async () => {
    setUser({ id: 'u1', email: 'a@b.c', name: 'Ada', role: 'user' })
    const result = await guestAdminMiddleware(to, to)
    expect(result).toBeUndefined()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('sends a signed-in admin home', async () => {
    setUser({ id: 'u1', email: 'a@b.c', name: 'Ada', role: 'admin' })
    const result = await guestAdminMiddleware(to, to)
    expect(result).toBe('/')
  })
})

describe('admin middleware', () => {
  beforeEach(() => {
    setUser(null)
    fetchUser.mockClear()
    navigateTo.mockClear()
  })

  it('sends guests to login', async () => {
    const result = await adminMiddleware(to, to)
    expect(result).toEqual({
      path: '/login',
      query: { redirect: '/secret' },
    })
  })

  it('sends a signed-in non-admin to login', async () => {
    setUser({ id: 'u1', email: 'a@b.c', name: 'Ada', role: 'user' })
    const result = await adminMiddleware(to, to)
    expect(result).toBe('/login')
  })

  it('lets an admin through', async () => {
    setUser({ id: 'u1', email: 'a@b.c', name: 'Ada', role: 'admin' })
    const result = await adminMiddleware(to, to)
    expect(result).toBeUndefined()
  })
})
