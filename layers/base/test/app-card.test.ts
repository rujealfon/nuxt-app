import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AppCard from '../app/components/AppCard.vue'

describe('appCard', () => {
  it('renders slot content on a light card', async () => {
    const wrapper = await mountSuspended(AppCard, {
      slots: { default: () => 'Hello' },
    })
    expect(wrapper.text()).toContain('Hello')
    expect(wrapper.get('div').classes()).toContain('bg-white')
  })

  it('uses the dark surface', async () => {
    const wrapper = await mountSuspended(AppCard, {
      props: { dark: true },
      slots: { default: () => 'Admin' },
    })
    expect(wrapper.get('div').classes()).toContain('bg-slate-800')
  })
})
