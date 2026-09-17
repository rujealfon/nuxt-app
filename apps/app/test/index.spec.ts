import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import IndexPage from '../app/pages/index.vue'

const auth = vi.hoisted(() => ({
  signOut: vi.fn(),
  actor: { email: 'user@example.com' },
}))

mockNuxtImport('useAuth', () => () => ({
  actor: ref(auth.actor),
  signOut: auth.signOut,
}))

beforeEach(() => {
  auth.signOut.mockReset()
  auth.signOut.mockResolvedValue(undefined)
})

describe('app index page', () => {
  it('shows the signed-in user', async () => {
    const wrapper = await mountSuspended(IndexPage)

    expect(wrapper.text()).toContain('user@example.com')
  })

  it('signs the user out', async () => {
    const wrapper = await mountSuspended(IndexPage)

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(auth.signOut).toHaveBeenCalled()
  })
})
