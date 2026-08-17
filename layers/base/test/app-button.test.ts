import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AppButton from '../app/components/AppButton.vue'

describe('appButton', () => {
  it('renders the slot label', async () => {
    const wrapper = await mountSuspended(AppButton, {
      slots: { default: () => 'Save' },
    })
    expect(wrapper.get('button').text()).toBe('Save')
  })

  it('is a submit button when type is submit', async () => {
    const wrapper = await mountSuspended(AppButton, {
      props: { type: 'submit' },
      slots: { default: () => 'Go' },
    })
    expect(wrapper.get('button').attributes('type')).toBe('submit')
  })

  it('disables the button', async () => {
    const wrapper = await mountSuspended(AppButton, {
      props: { disabled: true },
      slots: { default: () => 'Wait' },
    })
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })

  it('applies the danger variant class', async () => {
    const wrapper = await mountSuspended(AppButton, {
      props: { variant: 'danger' },
      slots: { default: () => 'Delete' },
    })
    expect(wrapper.get('button').classes()).toContain('bg-red-500')
  })
})
