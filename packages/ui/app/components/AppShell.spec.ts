import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AppShell from './AppShell.vue'

describe('appShell', () => {
  it('renders the shared shell around page content', async () => {
    const wrapper = await mountSuspended(AppShell, {
      slots: { default: '<p>page content</p>' },
    })

    expect(wrapper.text()).toContain('nuxt-app')
    expect(wrapper.text()).toContain('page content')
  })
})
