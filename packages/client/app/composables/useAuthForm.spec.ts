import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthForm } from './useAuthForm'

const navigateTo = vi.hoisted(() => vi.fn())

mockNuxtImport('navigateTo', () => navigateTo)

beforeEach(() => {
  navigateTo.mockReset()
  navigateTo.mockResolvedValue(undefined)
})

describe('useAuthForm', () => {
  it('navigates to an in-app path after a successful submit', async () => {
    const { onSubmit } = useAuthForm({
      submit: vi.fn().mockResolvedValue(undefined),
      redirectTo: '/settings',
    })

    await onSubmit({})

    expect(navigateTo).toHaveBeenCalledWith('/settings')
  })

  it.each(['https://evil.com', '//evil.com', '/\\evil.com'])(
    'rejects the redirect %s',
    async (redirectTo) => {
      const { onSubmit } = useAuthForm({
        submit: vi.fn().mockResolvedValue(undefined),
        redirectTo,
      })

      await onSubmit({})

      expect(navigateTo).toHaveBeenCalledWith('/')
    },
  )

  it('surfaces the thrown error message', async () => {
    const { errorMessage, onSubmit } = useAuthForm({
      submit: vi.fn().mockRejectedValue(new Error('Email already in use')),
      fallbackMessage: 'Unable to create your account',
    })

    await onSubmit({})

    expect(errorMessage.value).toBe('Email already in use')
  })

  it('falls back when the failure has no usable message', async () => {
    const { errorMessage, onSubmit } = useAuthForm({
      submit: vi.fn().mockRejectedValue('nope'),
      fallbackMessage: 'Invalid email or password',
    })

    await onSubmit({})

    expect(errorMessage.value).toBe('Invalid email or password')
  })

  it('reports a navigation failure separately from a submit failure', async () => {
    navigateTo.mockRejectedValue(new Error('external'))
    const { errorMessage, onSubmit } = useAuthForm({
      submit: vi.fn().mockResolvedValue(undefined),
      redirectTo: '/',
    })

    await onSubmit({})

    expect(errorMessage.value).toBe('Unable to continue')
  })

  it('ignores a second submit while the first is in flight', async () => {
    let finish: (() => void) | undefined
    const submit = vi.fn(() => new Promise<void>((resolve) => {
      finish = resolve
    }))
    const { onSubmit, submitting } = useAuthForm({ submit })

    const first = onSubmit({})
    await Promise.resolve()
    await onSubmit({})

    expect(submit).toHaveBeenCalledTimes(1)
    expect(submitting.value).toBe(true)

    finish?.()
    await first

    expect(submitting.value).toBe(false)
  })
})
