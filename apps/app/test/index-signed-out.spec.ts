import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import IndexPage from '../app/pages/index.vue'

// The signed-in file drives the real `useAuth`, whose session atom is a
// singleton shared across mounts. Mock it here to pin the signed-out branch.
mockNuxtImport('useAuth', () => () => ({ actor: null, signOut: vi.fn() }))

describe('app index page signed out', () => {
  it('invites signed-out visitors to sign in', async () => {
    const wrapper = await mountSuspended(IndexPage)

    expect(wrapper.text()).toContain('You are not signed in.')
    expect(wrapper.text()).not.toContain('Signed in as')
  })
})
