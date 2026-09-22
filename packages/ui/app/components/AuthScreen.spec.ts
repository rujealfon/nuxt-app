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

  it('forwards the submitted data to the submit prop', async () => {
    const submit = vi.fn()
    const wrapper = await mountScreen({ submit })

    wrapper.getComponent({ name: 'UAuthForm' }).vm.$emit('submit', { data: { email: 'user@example.com' } })
    await flushPromises()

    expect(submit).toHaveBeenCalledWith({ email: 'user@example.com' })
  })

  it('shows the error message in the validation slot', async () => {
    const wrapper = await mountScreen({ errorMessage: 'Invalid email or password' })

    expect(wrapper.text()).toContain('Invalid email or password')
  })

  it('applies server field errors to the form', async () => {
    const wrapper = await mountScreen()

    await wrapper.setProps({
      fieldErrors: [{ name: 'email', message: 'Enter a valid email address' }],
    })
    await flushPromises()

    const form = wrapper.getComponent({ name: 'UForm' }).vm as unknown as {
      getErrors: (name: string) => Array<{ message: string }>
    }

    expect(form.getErrors('email')).toEqual([
      expect.objectContaining({ message: 'Enter a valid email address' }),
    ])
  })

  it('passes the loading state to the form', async () => {
    const wrapper = await mountScreen({ loading: true })

    expect(wrapper.getComponent({ name: 'UAuthForm' }).props('submit')).toMatchObject({ loading: true })
  })

  it('clears field errors when the prop is removed', async () => {
    const wrapper = await mountScreen({ fieldErrors: [{ name: 'email', message: 'bad' }] })
    await flushPromises()

    await wrapper.setProps({ fieldErrors: undefined })
    await flushPromises()

    const form = wrapper.getComponent({ name: 'UForm' }).vm as unknown as {
      getErrors: (name: string) => unknown[]
    }

    expect(form.getErrors('email')).toEqual([])
  })
})
