import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AppInput from '../app/components/AppInput.vue'

describe('appInput', () => {
  it('renders the label and binds the model', async () => {
    const wrapper = await mountSuspended(AppInput, {
      props: {
        label: 'Email',
        modelValue: 'ada@example.com',
      },
    })

    expect(wrapper.get('span').text()).toBe('Email')
    expect(wrapper.get('input').element.value).toBe('ada@example.com')
  })

  it('emits the typed value', async () => {
    const wrapper = await mountSuspended(AppInput, {
      props: { label: 'Name', modelValue: '' },
    })

    await wrapper.get('input').setValue('Ada')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Ada'])
  })

  it('marks the field required', async () => {
    const wrapper = await mountSuspended(AppInput, {
      props: { required: true },
    })
    expect(wrapper.get('input').attributes('required')).toBeDefined()
  })
})
