import type { AuthUser } from '@nuxt-app/types'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import HomeWelcomeCard from './HomeWelcomeCard.vue'

const user = ref<AuthUser | null>({
  id: 'V1StGXR8_Z5jdHi6B-myT',
  email: 'ada@example.com',
  name: 'Ada',
  role: 'admin',
})

mockNuxtImport('useAuth', () => () => ({ user }))

describe('homeWelcomeCard', () => {
  it('shows the signed-in admin', async () => {
    const wrapper = await mountSuspended(HomeWelcomeCard)
    expect(wrapper.text()).toContain('Hello, Ada')
    expect(wrapper.text()).toContain('ada@example.com')
    expect(wrapper.text()).toContain('role: admin')
    expect(wrapper.text()).toContain('admin area')
  })
})
