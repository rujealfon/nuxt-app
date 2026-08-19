import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import AuthRegisterForm from './AuthRegisterForm.vue'

const { register } = vi.hoisted(() => ({
  register: vi.fn(),
}))

const error = ref<string | null>(null)

mockNuxtImport('useAuth', () => () => ({
  register,
  error,
}))

const UAuthFormStub = defineComponent({
  name: 'UAuthForm',
  props: {
    schema: { type: Object, default: undefined },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    submit: { type: Object, default: undefined },
  },
  emits: ['submit'],
  setup(props, { emit, slots }) {
    const schemaError = ref('')

    function attempt(data: Record<string, string>) {
      schemaError.value = ''
      const schema = props.schema as { safeParse: (value: unknown) => { success: true, data: Record<string, string> } | { success: false, error: { issues: Array<{ message: string }> } } } | undefined
      if (!schema) {
        schemaError.value = 'Missing schema'
        return
      }
      const parsed = schema.safeParse(data)
      if (!parsed.success) {
        schemaError.value = parsed.error.issues[0]?.message ?? 'Invalid'
        return
      }
      emit('submit', { data: parsed.data })
    }

    function onSubmit(event: Event) {
      event.preventDefault()
      attempt({
        email: 'ada@example.com',
        password: 'password12',
        name: 'Ada',
      })
    }

    return () => h('form', { onSubmit }, [
      h('h1', props.title),
      h('p', props.description),
      schemaError.value ? h('p', { class: 'schema-error' }, schemaError.value) : null,
      h('button', { type: 'submit' }, props.submit?.label ?? 'Submit'),
      h('button', { 'type': 'button', 'data-case': 'shortpw', 'onClick': () => attempt({ email: 'ada@example.com', password: 'short', name: 'Ada' }) }, 'shortpw'),
      slots.default?.(),
      slots.validation?.(),
      slots.footer?.(),
    ])
  },
})

const stubs = {
  UAuthForm: UAuthFormStub,
  UAlert: defineComponent({
    name: 'UAlert',
    props: { description: { type: String, default: '' } },
    setup: props => () => h('div', { class: 'alert' }, props.description),
  }),
  ULink: defineComponent({
    name: 'ULink',
    props: { to: { type: String, default: '' } },
    setup: (props, { slots }) => () => h('a', { href: props.to }, slots.default?.()),
  }),
}

function mountForm(props?: Record<string, unknown>) {
  return mountSuspended(AuthRegisterForm, {
    props,
    global: { stubs },
  })
}

describe('authRegisterForm', () => {
  beforeEach(() => {
    register.mockReset()
    error.value = null
  })

  it('renders the default title and a login link', async () => {
    const wrapper = await mountForm()
    expect(wrapper.text()).toContain('Create account')
    expect(wrapper.get('a[href="/login"]').text()).toContain('Sign in')
  })

  it('emits success after a valid register', async () => {
    register.mockResolvedValue({ message: 'Registered successfully' })
    const wrapper = await mountForm()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(register).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'password12',
      name: 'Ada',
    })
    expect(wrapper.emitted('success')).toHaveLength(1)
  })

  it('rejects a short register password through registerSchema', async () => {
    const wrapper = await mountForm()
    await wrapper.get('[data-case="shortpw"]').trigger('click')
    await flushPromises()

    expect(register).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Password must be at least 8 characters')
  })
})
