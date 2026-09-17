import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IndexPage from '../app/pages/index.vue'

// Crosses the real package seam: the real `useAuth` (auto-imported from the
// layer) with only the network below the vendor client replaced.
let sessionPayload: unknown = null

const fetchMock = vi.fn(async (input: unknown) => {
  // The client may pass the URL as a String object; coerce before matching.
  const url = input instanceof Request ? input.url : String(input)
  if (url.endsWith('/get-session')) {
    return Response.json(sessionPayload)
  }
  if (url.endsWith('/sign-out')) {
    return Response.json({})
  }
  return Response.json(null)
})

vi.stubGlobal('fetch', fetchMock)

function actorSession(role: string) {
  return {
    user: { id: 'user-1', email: 'user@example.com', name: null, role },
    session: { id: 'session-1' },
  }
}

beforeEach(() => {
  sessionPayload = null
  fetchMock.mockClear()
})

describe('app index page', () => {
  it('shows the signed-in actor', async () => {
    sessionPayload = actorSession('user')

    const wrapper = await mountSuspended(IndexPage)
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('user@example.com')
    })
  })

  it('signs out through the seam', async () => {
    sessionPayload = actorSession('user')

    const wrapper = await mountSuspended(IndexPage)
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('user@example.com')
    })

    await wrapper.find('button').trigger('click')
    await flushPromises()

    const requestedUrls = fetchMock.mock.calls.map(([input]) =>
      input instanceof Request ? input.url : String(input),
    )

    expect(requestedUrls.some(url => url.endsWith('/sign-out'))).toBe(true)
  })
})
