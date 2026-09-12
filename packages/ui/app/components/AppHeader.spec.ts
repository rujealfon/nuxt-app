import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AppHeader from './AppHeader.vue'

describe('appHeader', () => {
  it('renders the brand and site links', async () => {
    const wrapper = await mountSuspended(AppHeader)
    const text = wrapper.text()

    expect(text).toContain('mysite')
    expect(text).toContain('Home')
    expect(text).toContain('App')
    expect(text).toContain('Admin')
  })
})
