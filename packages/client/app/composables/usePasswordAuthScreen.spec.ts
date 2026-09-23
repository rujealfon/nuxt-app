import { loginSchema, registerSchema } from '@nuxt-app/types'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthRequestError } from '../lib/authError'
import { usePasswordAuthScreen } from './usePasswordAuthScreen'

const navigateTo = vi.hoisted(() => vi.fn())

mockNuxtImport('navigateTo', () => navigateTo)

beforeEach(() => {
  navigateTo.mockReset()
  navigateTo.mockResolvedValue(undefined)
})

describe('usePasswordAuthScreen', () => {
  it('selects the login schema and fields', () => {
    const { screenProps } = usePasswordAuthScreen({ mode: 'login', submit: vi.fn() })

    expect(screenProps.value.schema).toBe(loginSchema)
    expect(screenProps.value.fields.map(field => field.name)).toEqual(['email', 'password'])
  })

  it('selects the register schema and fields', () => {
    const { screenProps } = usePasswordAuthScreen({ mode: 'register', submit: vi.fn() })

    expect(screenProps.value.schema).toBe(registerSchema)
    expect(screenProps.value.fields.map(field => field.name)).toEqual(['name', 'email', 'password'])
  })

  it('carries the field errors the shared flow produces', async () => {
    const { screenProps } = usePasswordAuthScreen({
      mode: 'login',
      submit: vi.fn().mockRejectedValue(new AuthRequestError('The request was invalid', {
        error: 'invalid_input',
        message: 'The request was invalid',
        details: [{ path: ['email'], message: 'Enter a valid email address' }],
      })),
    })

    await screenProps.value.submit({})

    expect(screenProps.value.fieldErrors).toEqual([{ name: 'email', message: 'Enter a valid email address' }])
    expect(screenProps.value.errorMessage).toBe('')
  })

  it('navigates after a successful submit', async () => {
    const { screenProps } = usePasswordAuthScreen({ mode: 'login', submit: vi.fn(), redirectTo: '/home' })

    await screenProps.value.submit({})

    expect(navigateTo).toHaveBeenCalledWith('/home')
  })
})
