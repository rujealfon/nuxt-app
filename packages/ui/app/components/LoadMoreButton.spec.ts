import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import LoadMoreButton from './LoadMoreButton.vue'

describe('loadMoreButton', () => {
  it('renders a load-more button when more results exist', async () => {
    const wrapper = await mountSuspended(LoadMoreButton, {
      props: { hasMore: true },
    })

    expect(wrapper.text()).toContain('Load more')
  })

  it('renders a custom label', async () => {
    const wrapper = await mountSuspended(LoadMoreButton, {
      props: { hasMore: true, label: 'Show more' },
    })

    expect(wrapper.text()).toContain('Show more')
  })

  it('renders nothing when no more results exist', async () => {
    const wrapper = await mountSuspended(LoadMoreButton, {
      props: { hasMore: false },
    })

    expect(wrapper.html()).not.toContain('Load more')
  })

  it('emits loadMore on click', async () => {
    const wrapper = await mountSuspended(LoadMoreButton, {
      props: { hasMore: true },
    })

    await wrapper.getComponent({ name: 'UButton' }).trigger('click')

    expect(wrapper.emitted('loadMore')).toHaveLength(1)
  })

  it('passes loading state to the button', async () => {
    const wrapper = await mountSuspended(LoadMoreButton, {
      props: { hasMore: true, loading: true },
    })

    expect(wrapper.getComponent({ name: 'UButton' }).props('loading')).toBe(true)
  })
})
