import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RegisterPage from '../app/pages/register.vue'

const auth = vi.hoisted(() => ({ signUp: vi.fn(), navigateTo: vi.fn() }))
mockNuxtImport('useAuth', () => () => ({ signUp: auth.signUp }))
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

    await wrapper.find('input[name="name"]').setValue('A')
    await wrapper.find('input[name="email"]').setValue('user@example.com')
    await wrapper.find('input[name="password"]').setValue('longenough')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(auth.signUp).toHaveBeenCalledWith({ name: 'A', email: 'user@example.com', password: 'longenough' })
    expect(auth.navigateTo).toHaveBeenCalledWith('/')
  })

  it('surfaces the reason when sign up fails', async () => {
    auth.signUp.mockRejectedValue(new Error('Email already in use'))
    const wrapper = await mountSuspended(RegisterPage)

    await wrapper.find('input[name="name"]').setValue('A')
    await wrapper.find('input[name="email"]').setValue('user@example.com')
    await wrapper.find('input[name="password"]').setValue('longenough')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Email already in use')
  })
})
