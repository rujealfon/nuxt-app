import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IndexPage from '../app/pages/index.vue'

const navigateTo = vi.hoisted(() => vi.fn())
mockNuxtImport('navigateTo', () => navigateTo)

beforeEach(() => {
  navigateTo.mockReset()
})

describe('web index page', () => {
  it('renders the hero', async () => {
    const wrapper = await mountSuspended(IndexPage)

    expect(wrapper.text()).toContain('Welcome to mysite')
  })

  it('opens the app in a new context', async () => {
    const wrapper = await mountSuspended(IndexPage)

    await wrapper.find('button').trigger('click')

    expect(navigateTo).toHaveBeenCalledWith('http://app.test', { external: true })
  })
})
