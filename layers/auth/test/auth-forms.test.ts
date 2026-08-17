import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import AuthLoginForm from '../app/components/AuthLoginForm.vue'
import AuthRegisterForm from '../app/components/AuthRegisterForm.vue'

const { login, register, logout } = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}))

const error = ref<string | null>(null)

mockNuxtImport('useAuth', () => () => ({
  login,
  register,
  logout,
  error,
}))

const UAuthFormStub = defineComponent({
  name: 'UAuthForm',
  props: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    submit: { type: Object, default: undefined },
  },
  emits: ['submit'],
  setup(props, { emit, slots }) {
    function onSubmit(event: Event) {
      event.preventDefault()
      emit('submit', {
        data: {
          email: 'ada@example.com',
          password: 'password12',
          name: 'Ada',
        },
      })
    }

    return () => h('form', { onSubmit }, [
      h('h1', props.title),
      h('p', props.description),
      h('button', { type: 'submit' }, props.submit?.label ?? 'Submit'),
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

function mountForm(component: typeof AuthLoginForm, props?: Record<string, unknown>) {
  return mountSuspended(component, {
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
    const wrapper = await mountForm(AuthLoginForm, { registerTo: '/register' })
    expect(wrapper.text()).toContain('Welcome back!')
    expect(wrapper.get('a[href="/register"]').text()).toContain('Sign up')
  })

  it('emits success after a valid login', async () => {
    const res = {
      user: { id: 'u1', email: 'ada@example.com', name: 'Ada', role: 'user' },
    }
    login.mockResolvedValue(res)
    const wrapper = await mountForm(AuthLoginForm)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(login).toHaveBeenCalledWith('ada@example.com', 'password12')
    expect(wrapper.emitted('success')?.[0]).toEqual([res])
  })

  it('logs the user out when requireRole does not match', async () => {
    login.mockResolvedValue({
      user: { id: 'u1', email: 'ada@example.com', name: 'Ada', role: 'user' },
    })
    const wrapper = await mountForm(AuthLoginForm, {
      requireRole: 'admin',
      title: 'Admin login',
    })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(logout).toHaveBeenCalledWith('')
    expect(wrapper.text()).toContain('This account is not an admin.')
    expect(wrapper.emitted('success')).toBeUndefined()
  })

  it('shows the auth error from useAuth', async () => {
    error.value = 'Invalid credentials'
    const wrapper = await mountForm(AuthLoginForm)
    expect(wrapper.text()).toContain('Invalid credentials')
  })
})

describe('authRegisterForm', () => {
  beforeEach(() => {
    register.mockReset()
    error.value = null
  })

  it('renders the default title and a login link', async () => {
    const wrapper = await mountForm(AuthRegisterForm)
    expect(wrapper.text()).toContain('Create account')
    expect(wrapper.get('a[href="/login"]').text()).toContain('Sign in')
  })

  it('emits success after a valid register', async () => {
    register.mockResolvedValue({ message: 'Registered successfully' })
    const wrapper = await mountForm(AuthRegisterForm)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(register).toHaveBeenCalledWith('ada@example.com', 'password12', 'Ada')
    expect(wrapper.emitted('success')).toHaveLength(1)
  })
})
