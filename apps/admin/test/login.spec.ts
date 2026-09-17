import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from '../app/pages/login.vue'

const auth = vi.hoisted(() => ({ signIn: vi.fn(), navigateTo: vi.fn(), redirect: '/' }))
mockNuxtImport('useAuth', () => () => ({ signIn: auth.signIn, isPending: false }))
mockNuxtImport('useRoute', () => () => ({ query: { redirect: auth.redirect } }))
mockNuxtImport('navigateTo', () => auth.navigateTo)

beforeEach(() => {
  auth.signIn.mockReset()
  auth.navigateTo.mockReset()
  auth.redirect = '/'
})

describe('admin login page', () => {
  it('renders the admin sign-in form', async () => {
    const wrapper = await mountSuspended(LoginPage)

    expect(wrapper.text()).toContain('Admin sign in')
  })

  it('honours the redirect query on success', async () => {
    auth.redirect = '/users'
    auth.signIn.mockResolvedValue(undefined)
    const wrapper = await mountSuspended(LoginPage)

    wrapper.findComponent({ name: 'UAuthForm' }).vm.$emit('submit', {
      data: { email: 'admin@example.com', password: 'secret' },
    })
    await flushPromises()

    expect(auth.navigateTo).toHaveBeenCalledWith('/users')
  })

  it('shows an error when sign in fails', async () => {
    auth.signIn.mockRejectedValue(new Error('bad credentials'))
    const wrapper = await mountSuspended(LoginPage)

    wrapper.findComponent({ name: 'UAuthForm' }).vm.$emit('submit', {
      data: { email: 'admin@example.com', password: 'nope' },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Invalid email or password')
  })
})
