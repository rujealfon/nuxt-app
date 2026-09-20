import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from '../app/pages/login.vue'

const auth = vi.hoisted(() => ({ signIn: vi.fn(), navigateTo: vi.fn() }))
mockNuxtImport('useAuth', () => () => ({ signIn: auth.signIn }))
mockNuxtImport('navigateTo', () => auth.navigateTo)

beforeEach(() => {
  auth.signIn.mockReset()
  auth.navigateTo.mockReset()
})

describe('app login page', () => {
  it('renders the sign-in form', async () => {
    const wrapper = await mountSuspended(LoginPage)

    expect(wrapper.text()).toContain('Welcome back')
    expect(wrapper.text()).toContain('Create an account')
  })

  it('navigates home on a successful sign in', async () => {
    auth.signIn.mockResolvedValue(undefined)
    const wrapper = await mountSuspended(LoginPage)

    wrapper.findComponent({ name: 'UAuthForm' }).vm.$emit('submit', {
      data: { email: 'user@example.com', password: 'secret' },
    })
    await flushPromises()

    expect(auth.signIn).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret' })
    expect(auth.navigateTo).toHaveBeenCalledWith('/')
  })

  it('surfaces the failure message when sign in fails', async () => {
    auth.signIn.mockRejectedValue(new Error('Invalid email or password'))
    const wrapper = await mountSuspended(LoginPage)

    wrapper.findComponent({ name: 'UAuthForm' }).vm.$emit('submit', {
      data: { email: 'user@example.com', password: 'nope' },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Invalid email or password')
  })
})
