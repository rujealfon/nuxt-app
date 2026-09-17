import type { FormSchema } from '@nuxt/ui'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import AuthScreen from './AuthScreen.vue'

const navigateTo = vi.hoisted(() => vi.fn())

mockNuxtImport('navigateTo', () => navigateTo)

const schema = { safeParse: (value: unknown) => ({ success: true, data: value }) } as FormSchema

const fields = [
  { name: 'email', type: 'email' as const, label: 'Email' },
]

async function mountScreen(props: Record<string, unknown> = {}) {
  return mountSuspended(AuthScreen, {
    props: {
      title: 'Sign in',
      description: 'Hello',
      icon: 'i-lucide-lock',
      schema,
      fields,
      submitLabel: 'Go',
      failureMessage: 'Invalid email or password',
      redirectTo: '/',
      submitAction: vi.fn().mockResolvedValue(undefined),
      ...props,
    },
  })
}

async function submit(wrapper: Awaited<ReturnType<typeof mountScreen>>) {
  await wrapper.getComponent({ name: 'UAuthForm' }).vm.$emit('submit', { data: { email: 'user@example.com' } })
  await flushPromises()
}

describe('authScreen', () => {
  beforeEach(() => {
    navigateTo.mockReset()
    navigateTo.mockResolvedValue(undefined)
  })

  it('navigates to an in-app path after a successful submit', async () => {
    const wrapper = await mountScreen({ redirectTo: '/settings' })

    await submit(wrapper)

    expect(navigateTo).toHaveBeenCalledWith('/settings')
  })

  it('rejects external redirects', async () => {
    const wrapper = await mountScreen({ redirectTo: 'https://evil.com' })

    await submit(wrapper)

    expect(navigateTo).toHaveBeenCalledWith('/')
  })

  it('rejects protocol-relative redirects', async () => {
    const wrapper = await mountScreen({ redirectTo: '//evil.com' })

    await submit(wrapper)

    expect(navigateTo).toHaveBeenCalledWith('/')
  })

  it('shows the auth failure message without navigating', async () => {
    const wrapper = await mountScreen({
      submitAction: vi.fn().mockRejectedValue(new Error('nope')),
    })

    await submit(wrapper)

    expect(wrapper.text()).toContain('Invalid email or password')
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('does not report a navigation failure as bad credentials', async () => {
    navigateTo.mockRejectedValue(new Error('external'))
    const wrapper = await mountScreen()

    await submit(wrapper)

    expect(wrapper.text()).toContain('Unable to continue')
    expect(wrapper.text()).not.toContain('Invalid email or password')
  })

  it('ignores a second submit while the first is in flight', async () => {
    let finish: (() => void) | undefined
    const submitAction = vi.fn(() => new Promise<void>((resolve) => {
      finish = resolve
    }))
    const wrapper = await mountScreen({ submitAction })

    await wrapper.getComponent({ name: 'UAuthForm' }).vm.$emit('submit', { data: { email: 'user@example.com' } })
    await nextTick()
    await wrapper.getComponent({ name: 'UAuthForm' }).vm.$emit('submit', { data: { email: 'user@example.com' } })

    expect(submitAction).toHaveBeenCalledTimes(1)
    expect(wrapper.getComponent({ name: 'UAuthForm' }).props('submit')).toMatchObject({ loading: true })

    finish?.()
    await flushPromises()

    expect(wrapper.getComponent({ name: 'UAuthForm' }).props('submit')).toMatchObject({ loading: false })
  })
})
