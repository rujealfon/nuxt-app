import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import PageNumberPagination from './PageNumberPagination.vue'

describe('pageNumberPagination', () => {
  it('passes page, total, and page size to UPagination', async () => {
    const wrapper = await mountSuspended(PageNumberPagination, {
      props: { page: 2, total: 100, pageSize: 20 },
    })

    const pagination = wrapper.getComponent({ name: 'UPagination' })
    expect(pagination.props('page')).toBe(2)
    expect(pagination.props('total')).toBe(100)
    expect(pagination.props('itemsPerPage')).toBe(20)
  })

  it('defaults the page size to 20', async () => {
    const wrapper = await mountSuspended(PageNumberPagination, {
      props: { page: 1, total: 50 },
    })

    expect(wrapper.getComponent({ name: 'UPagination' }).props('itemsPerPage')).toBe(20)
  })

  it('re-emits page changes', async () => {
    const wrapper = await mountSuspended(PageNumberPagination, {
      props: { page: 1, total: 100 },
    })

    await wrapper.getComponent({ name: 'UPagination' }).vm.$emit('update:page', 3)

    expect(wrapper.emitted('update:page')).toEqual([[3]])
  })

  it('disables pagination while loading', async () => {
    const wrapper = await mountSuspended(PageNumberPagination, {
      props: { page: 1, total: 100, loading: true },
    })

    expect(wrapper.getComponent({ name: 'UPagination' }).props('disabled')).toBe(true)
  })

  it('stays enabled when idle', async () => {
    const wrapper = await mountSuspended(PageNumberPagination, {
      props: { page: 1, total: 100 },
    })

    expect(wrapper.getComponent({ name: 'UPagination' }).props('disabled')).toBe(false)
  })
})
