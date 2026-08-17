import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { useQueryCache } from '@pinia/colada'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { authKeys, useAuth } from '../app/composables/useAuth'

const { login, register, logout, me, navigateTo } = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(async () => ({ user: null })),
  navigateTo: vi.fn(),
}))

vi.mock('@nuxt-app/auth', () => ({
  createAuthClient: () => ({ login, register, logout, me }),
  resolveAuthApiBase: (url: string) => url,
}))

mockNuxtImport('navigateTo', () => navigateTo)

const user = {
  id: 'V1StGXR8_Z5jdHi6B-myT',
  email: 'ada@example.com',
  name: 'Ada',
  role: 'user' as const,
}

const admin = { ...user, role: 'admin' as const }

const Harness = defineComponent({
  setup() {
    const auth = useAuth()
    const queryCache = useQueryCache()
    function reset() {
      queryCache.setQueryData(authKeys.me, null)
      auth.error.value = null
    }
    function markMeStale() {
      return queryCache.invalidateQueries({ key: [...authKeys.me] }, false)
    }
    return { ...auth, reset, markMeStale }
  },
  template: '<div />',
})

async function mountAuth() {
  const wrapper = await mountSuspended(Harness)
  wrapper.vm.reset()
  return wrapper
}

describe('useAuth', () => {
  beforeEach(() => {
    me.mockResolvedValue({ user: null })
    login.mockReset()
    register.mockReset()
    logout.mockReset()
    navigateTo.mockReset()
  })

  it('starts unauthenticated when me returns no user', async () => {
    const wrapper = await mountAuth()
    expect(wrapper.vm.user).toBeNull()
    expect(wrapper.vm.isAuthenticated).toBe(false)
    expect(wrapper.vm.isAdmin).toBe(false)
  })

  it('sets the user after a successful login', async () => {
    vi.mocked(login).mockResolvedValue({ user, message: 'ok' })
    const wrapper = await mountAuth()

    await expect(wrapper.vm.login('ada@example.com', 'password12'))
      .resolves
      .toEqual({ user, message: 'ok' })

    expect(wrapper.vm.user).toEqual(user)
    expect(wrapper.vm.isAuthenticated).toBe(true)
    expect(wrapper.vm.error).toBeNull()
  })

  it('records the error message when login fails', async () => {
    vi.mocked(login).mockRejectedValue(new Error('Invalid credentials'))
    const wrapper = await mountAuth()

    await expect(wrapper.vm.login('ada@example.com', 'nope'))
      .rejects
      .toThrow('Invalid credentials')

    expect(wrapper.vm.error).toBe('Invalid credentials')
    expect(wrapper.vm.user).toBeNull()
  })

  it('registers with the submitted name', async () => {
    vi.mocked(register).mockResolvedValue({ message: 'Registered successfully' })
    const wrapper = await mountAuth()

    await expect(wrapper.vm.register('ada@example.com', 'password12', 'Ada'))
      .resolves
      .toEqual({ message: 'Registered successfully' })

    expect(register).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'password12',
      name: 'Ada',
    })
  })

  it('clears the user and navigates away on logout', async () => {
    vi.mocked(login).mockResolvedValue({ user })
    vi.mocked(logout).mockResolvedValue({ message: 'Logged out' })
    const wrapper = await mountAuth()
    await wrapper.vm.login('ada@example.com', 'password12')

    await wrapper.vm.logout()

    expect(wrapper.vm.user).toBeNull()
    expect(navigateTo).toHaveBeenCalledWith('/login')
  })

  it('skips navigation when logout is called with an empty redirect', async () => {
    vi.mocked(logout).mockResolvedValue({ message: 'Logged out' })
    const wrapper = await mountAuth()

    await wrapper.vm.logout('')

    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('treats an admin user as admin', async () => {
    vi.mocked(login).mockResolvedValue({ user: admin })
    const wrapper = await mountAuth()
    await wrapper.vm.login('ada@example.com', 'password12')
    expect(wrapper.vm.isAdmin).toBe(true)
  })

  it('revalidates a stale successful me query on ensureUser', async () => {
    vi.mocked(login).mockResolvedValue({ user })
    const wrapper = await mountAuth()
    await wrapper.vm.login('ada@example.com', 'password12')
    vi.mocked(me).mockClear()
    vi.mocked(me).mockResolvedValue({ user: null })

    await wrapper.vm.ensureUser()
    expect(wrapper.vm.user).toEqual(user)
    expect(me).not.toHaveBeenCalled()

    await wrapper.vm.markMeStale()
    await wrapper.vm.ensureUser()
    expect(wrapper.vm.user).toBeNull()
    expect(me).toHaveBeenCalled()
  })
})
