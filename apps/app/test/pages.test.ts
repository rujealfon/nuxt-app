import type { AuthUser } from '@nuxt-app/types'
import IndexPage from '@app/pages/index.vue'
import LoginPage from '@app/pages/login.vue'
import RegisterPage from '@app/pages/register.vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const { logout, login, register } = vi.hoisted(() => ({
  logout: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
}))

const user = ref<AuthUser | null>({
  id: 'V1StGXR8_Z5jdHi6B-myT',
  email: 'ada@example.com',
  name: 'Ada',
  role: 'user',
})
const error = ref<string | null>(null)

mockNuxtImport('useAuth', () => () => ({
  user,
  logout,
  login,
  register,
  error,
}))

describe('app pages', () => {
  beforeEach(() => {
    user.value = {
      id: 'V1StGXR8_Z5jdHi6B-myT',
      email: 'ada@example.com',
      name: 'Ada',
      role: 'user',
    }
    error.value = null
    logout.mockReset()
  })

  it('shows the signed-in user on the home page', async () => {
    const wrapper = await mountSuspended(IndexPage)
    expect(wrapper.get('h1').text()).toBe('Nuxt App')
    expect(wrapper.text()).toContain('Welcome, Ada!')
    expect(wrapper.text()).toContain('ada@example.com')
    expect(wrapper.text()).toContain('V1StGXR8_Z5jdHi6B-myT')
    expect(wrapper.text()).toContain('user')
  })

  it('logs out from the home page', async () => {
    const wrapper = await mountSuspended(IndexPage)
    await wrapper.get('button').trigger('click')
    expect(logout).toHaveBeenCalled()
  })

  it('renders the login form with a register link', async () => {
    const wrapper = await mountSuspended(LoginPage)
    expect(wrapper.text()).toContain('Welcome back!')
    expect(wrapper.text()).toContain('Sign up')
  })

  it('renders the register form', async () => {
    const wrapper = await mountSuspended(RegisterPage)
    expect(wrapper.text()).toContain('Create account')
    expect(wrapper.text()).toContain('Sign in')
  })
})
