import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RegisterPage from '../app/pages/register.vue'

const auth = vi.hoisted(() => ({ signUp: vi.fn(), navigateTo: vi.fn() }))
mockNuxtImport('useAuth', () => () => ({ signUp: auth.signUp, isPending: false }))
mockNuxtImport('navigateTo', () => auth.navigateTo)

beforeEach(() => {
  auth.signUp.mockReset()
  auth.navigateTo.mockReset()
})

describe('app register page', () => {
  it('renders the registration form', async () => {
    const wrapper = await mountSuspended(RegisterPage)

    expect(wrapper.text()).toContain('Create your account')
    expect(wrapper.text()).toContain('Already have an account?')
  })

  it('navigates home on a successful sign up', async () => {
    auth.signUp.mockResolvedValue(undefined)
    const wrapper = await mountSuspended(RegisterPage)

    wrapper.findComponent({ name: 'UAuthForm' }).vm.$emit('submit', {
      data: { name: 'A', email: 'user@example.com', password: 'longenough' },
    })
    await flushPromises()

    expect(auth.signUp).toHaveBeenCalledWith({ name: 'A', email: 'user@example.com', password: 'longenough' })
    expect(auth.navigateTo).toHaveBeenCalledWith('/')
  })

  it('shows a safe error when sign up fails', async () => {
    auth.signUp.mockRejectedValue(new Error('Email already in use'))
    const wrapper = await mountSuspended(RegisterPage)

    wrapper.findComponent({ name: 'UAuthForm' }).vm.$emit('submit', {
      data: { name: 'A', email: 'user@example.com', password: 'longenough' },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to create your account')
    expect(wrapper.text()).not.toContain('Email already in use')
  })
})
