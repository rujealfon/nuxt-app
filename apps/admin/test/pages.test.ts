import type { AuthUser } from '@nuxt-app/types'
import IndexPage from '@admin/pages/index.vue'
import LoginPage from '@admin/pages/login.vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const { logout, login } = vi.hoisted(() => ({
  logout: vi.fn(),
  login: vi.fn(),
}))

const user = ref<AuthUser | null>({
  id: 'V1StGXR8_Z5jdHi6B-myT',
  email: 'ada@example.com',
  name: 'Ada',
  role: 'admin',
})
const error = ref<string | null>(null)

mockNuxtImport('useAuth', () => () => ({
  user,
  logout,
  login,
  error,
}))

describe('admin pages', () => {
  beforeEach(() => {
    user.value = {
      id: 'V1StGXR8_Z5jdHi6B-myT',
      email: 'ada@example.com',
      name: 'Ada',
      role: 'admin',
    }
    error.value = null
    logout.mockReset()
  })

  it('shows the admin home for an administrator', async () => {
    const wrapper = await mountSuspended(IndexPage)
    expect(wrapper.get('h1').text()).toBe('Admin Panel')
    expect(wrapper.text()).toContain('Hello, Ada')
    expect(wrapper.text()).toContain('ada@example.com')
    expect(wrapper.text()).toContain('role: admin')
  })

  it('logs out from the admin home', async () => {
    const wrapper = await mountSuspended(IndexPage)
    const logoutButton = wrapper.findAll('button').find(button => button.text() === 'Logout')
    expect(logoutButton).toBeDefined()
    await logoutButton!.trigger('click')
    expect(logout).toHaveBeenCalled()
  })

  it('renders the admin-only login form', async () => {
    const wrapper = await mountSuspended(LoginPage)
    expect(wrapper.text()).toContain('Admin login')
    expect(wrapper.text()).toContain('Administrator access only.')
    expect(wrapper.text()).not.toContain('Sign up')
  })
})
