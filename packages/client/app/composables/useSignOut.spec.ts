import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSignOut } from './useSignOut'

const mocks = vi.hoisted(() => ({ signOut: vi.fn(), navigateTo: vi.fn() }))

mockNuxtImport('useAuth', () => () => ({ signOut: mocks.signOut }))
mockNuxtImport('navigateTo', () => mocks.navigateTo)

beforeEach(() => {
  mocks.signOut.mockReset()
  mocks.navigateTo.mockReset()
  mocks.navigateTo.mockResolvedValue(undefined)
})

describe('useSignOut', () => {
  it('revokes the session and stays in place without a redirect', async () => {
    const { signOut, isSigningOut } = useSignOut()

    await signOut()

    expect(mocks.signOut).toHaveBeenCalled()
    expect(mocks.navigateTo).not.toHaveBeenCalled()
    expect(isSigningOut.value).toBe(false)
  })

  it('navigates after a successful revoke', async () => {
    const { signOut } = useSignOut('/login')

    await signOut()

    expect(mocks.navigateTo).toHaveBeenCalledWith('/login')
  })

  it('clears the loading state when the revoke fails and does not navigate', async () => {
    mocks.signOut.mockRejectedValue(new Error('network down'))
    const { signOut, isSigningOut } = useSignOut('/login')

    await expect(signOut()).rejects.toThrow('network down')

    expect(isSigningOut.value).toBe(false)
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })
})
