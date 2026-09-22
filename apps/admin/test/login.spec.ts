import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from '../app/pages/login.vue'

const auth = vi.hoisted(() => ({ signIn: vi.fn(), navigateTo: vi.fn(), redirect: '/' }))
mockNuxtImport('useAuth', () => () => ({ signIn: auth.signIn }))
mockNuxtImport('useRoute', () => () => ({ query: { redirect: auth.redirect } }))
mockNuxtImport('navigateTo', () => auth.navigateTo)

beforeEach(() => {
  auth.signIn.mockReset()
  auth.navigateTo.mockReset()
  auth.redirect = '/'
})

async function signIn(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
  await wrapper.find('input[name="email"]').setValue('admin@example.com')
  await wrapper.find('input[name="password"]').setValue('secret')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('admin login page', () => {
  it('renders the admin sign-in form', async () => {
    const wrapper = await mountSuspended(LoginPage)

    expect(wrapper.text()).toContain('Admin sign in')
  })

  it('honours the redirect query on success', async () => {
    auth.redirect = '/users'
    auth.signIn.mockResolvedValue(undefined)
    const wrapper = await mountSuspended(LoginPage)

    await signIn(wrapper)

    expect(auth.navigateTo).toHaveBeenCalledWith('/users')
  })

  it('surfaces the failure message when sign in fails', async () => {
    auth.signIn.mockRejectedValue(new Error('Invalid email or password'))
    const wrapper = await mountSuspended(LoginPage)

    await signIn(wrapper)

    expect(wrapper.text()).toContain('Invalid email or password')
  })

  it('falls back to the app root when the redirect is not a string', async () => {
    auth.redirect = ['/users'] as unknown as string
    auth.signIn.mockResolvedValue(undefined)
    const wrapper = await mountSuspended(LoginPage)

    await signIn(wrapper)

    expect(auth.navigateTo).toHaveBeenCalledWith('/')
  })
})
