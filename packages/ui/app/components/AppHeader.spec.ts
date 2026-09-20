import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AppHeader from './AppHeader.vue'

describe('appHeader', () => {
  it('renders the brand and site links', async () => {
    const wrapper = await mountSuspended(AppHeader)
    const text = wrapper.text()

    expect(text).toContain('nuxt-app')
    expect(text).toContain('Home')
    expect(text).toContain('App')
    expect(text).toContain('Admin')
  })

  it('links each nav item to its site url', async () => {
    const wrapper = await mountSuspended(AppHeader)

    expect(wrapper.findAll('a').map(link => link.attributes('href'))).toEqual([
      'http://web.test',
      'http://app.test',
      'http://admin.test',
    ])
  })

  it('highlights the current app and leaves the rest ghosted', async () => {
    const wrapper = await mountSuspended(AppHeader)
    const variants = wrapper
      .findAllComponents({ name: 'UButton' })
      .filter(button => ['Home', 'App', 'Admin'].includes(button.props('label') as string))
      .map(button => button.props('variant'))

    // The `ui` test project runs as the web app.
    expect(variants).toEqual(['soft', 'ghost', 'ghost'])
  })
})
