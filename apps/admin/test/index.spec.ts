import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IndexPage from '../app/pages/index.vue'

const auth = vi.hoisted(() => ({
  signOut: vi.fn(),
  navigateTo: vi.fn(),
  actor: { email: 'admin@example.com' } as { email: string } | null,
}))

mockNuxtImport('useAuth', () => () => ({ actor: auth.actor, signOut: auth.signOut }))
mockNuxtImport('navigateTo', () => auth.navigateTo)

beforeEach(() => {
  auth.signOut.mockReset()
  auth.navigateTo.mockReset()
  auth.actor = { email: 'admin@example.com' }
})

describe('admin index page', () => {
  it('shows the signed-in admin', async () => {
    const wrapper = await mountSuspended(IndexPage)

    expect(wrapper.text()).toContain('admin@example.com')
  })

  it('signs out and returns to login', async () => {
    auth.signOut.mockResolvedValue(undefined)
    const wrapper = await mountSuspended(IndexPage)

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(auth.signOut).toHaveBeenCalled()
    expect(auth.navigateTo).toHaveBeenCalledWith('/login')
  })

  it('hides the sign-out action without an actor', async () => {
    auth.actor = null
    const wrapper = await mountSuspended(IndexPage)

    expect(wrapper.find('button').exists()).toBe(false)
  })
})
