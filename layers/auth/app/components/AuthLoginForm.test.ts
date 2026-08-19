import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import AuthLoginForm from './AuthLoginForm.vue'

const { login, logout } = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
}))

const error = ref<string | null>(null)

mockNuxtImport('useAuth', () => () => ({
  login,
  logout,
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
      h('button', { 'type': 'button', 'data-case': 'empty', 'onClick': () => attempt({ email: '', password: '' }) }, 'empty'),
      h('button', { 'type': 'button', 'data-case': 'bademail', 'onClick': () => attempt({ email: 'x', password: 'password12' }) }, 'bademail'),
      h('button', { 'type': 'button', 'data-case': 'longpw', 'onClick': () => attempt({ email: 'ada@example.com', password: 'a'.repeat(73) }) }, 'longpw'),
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
  return mountSuspended(AuthLoginForm, {
    props,
    global: { stubs },
  })
}

describe('authLoginForm', () => {
  beforeEach(() => {
    login.mockReset()
    logout.mockReset()
    error.value = null
  })

  it('renders the default title and a register link', async () => {
    const wrapper = await mountForm({ registerTo: '/register' })
    expect(wrapper.text()).toContain('Welcome back!')
    expect(wrapper.get('a[href="/register"]').text()).toContain('Sign up')
  })

  it('emits success after a valid login', async () => {
    const res = {
      user: { id: 'u1', email: 'ada@example.com', name: 'Ada', role: 'user' },
    }
    login.mockResolvedValue(res)
    const wrapper = await mountForm()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(login).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'password12',
    })
    expect(wrapper.emitted('success')?.[0]).toEqual([res])
  })

  it('rejects an empty login through loginSchema', async () => {
    const wrapper = await mountForm()
    await wrapper.get('[data-case="empty"]').trigger('click')
    await flushPromises()

    expect(login).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Email and password are required')
  })

  it('rejects a malformed email through loginSchema', async () => {
    const wrapper = await mountForm()
    await wrapper.get('[data-case="bademail"]').trigger('click')
    await flushPromises()

    expect(login).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Invalid email')
  })

  it('rejects a 73-byte password through loginSchema', async () => {
    const wrapper = await mountForm()
    await wrapper.get('[data-case="longpw"]').trigger('click')
    await flushPromises()

    expect(login).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Password must be at most 72 bytes')
  })

  it('sends requireRole and does not start a Session undo on denial', async () => {
    login.mockImplementation(async () => {
      error.value = 'This account is not an admin.'
      throw new Error('This account is not an admin.')
    })
    const wrapper = await mountForm({
      requireRole: 'admin',
      title: 'Admin login',
    })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(login).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'password12',
      requireRole: 'admin',
    })
    expect(logout).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('This account is not an admin.')
    expect(wrapper.emitted('success')).toBeUndefined()
  })

  it('shows the auth error from useAuth', async () => {
    error.value = 'Invalid credentials'
    const wrapper = await mountForm()
    expect(wrapper.text()).toContain('Invalid credentials')
  })
})
