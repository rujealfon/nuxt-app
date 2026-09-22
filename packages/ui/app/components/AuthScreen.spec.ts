import type { FormSchema } from '@nuxt/ui'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import AuthScreen from './AuthScreen.vue'

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
      submit: vi.fn(),
      ...props,
    },
  })
}

describe('authScreen', () => {
  it('renders the title and footer slot', async () => {
    const wrapper = await mountSuspended(AuthScreen, {
      props: {
        title: 'Sign in',
        description: 'Hello',
        icon: 'i-lucide-lock',
        schema,
        fields,
        submitLabel: 'Go',
        submit: vi.fn(),
      },
      slots: { footer: '<p>New here?</p>' },
    })

    expect(wrapper.text()).toContain('Sign in')
    expect(wrapper.text()).toContain('New here?')
  })

  it('shows the error message in the validation slot', async () => {
    const wrapper = await mountScreen({ errorMessage: 'Invalid email or password' })

    expect(wrapper.text()).toContain('Invalid email or password')
  })

  it('renders server field errors and clears them when the prop is removed', async () => {
    const wrapper = await mountScreen()
    await flushPromises()

    await wrapper.setProps({ fieldErrors: [{ name: 'email', message: 'Already taken' }] })
    await flushPromises()

    expect(wrapper.text()).toContain('Already taken')

    await wrapper.setProps({ fieldErrors: undefined })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Already taken')
  })

  it('disables the submit button while loading', async () => {
    const wrapper = await mountScreen({ loading: true })

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
})
