import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../app/composables/useAuth'

const signInEmail = vi.fn()
const signUpEmail = vi.fn()
const signOut = vi.fn()
const useSession = vi.fn(() => ({
  value: { data: { user: { id: 'user-1', email: 'user@example.com' } }, isPending: false },
}))

vi.mock('better-auth/vue', () => ({
  createAuthClient: () => ({
    useSession,
    signIn: { email: signInEmail },
    signUp: { email: signUpEmail },
    signOut,
  }),
}))

beforeEach(() => {
  signInEmail.mockReset()
  signUpEmail.mockReset()
  signOut.mockReset()
  useSession.mockClear()
})

describe('useAuth', () => {
  it('exposes the session user', () => {
    expect(useAuth().user.value).toEqual({ id: 'user-1', email: 'user@example.com' })
  })

  it('signs in through the auth client', async () => {
    signInEmail.mockResolvedValue({ data: {}, error: null })

    await useAuth().signIn({ email: 'user@example.com', password: 'secret' })

    expect(signInEmail).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret' })
  })

  it('throws when sign in fails', async () => {
    signInEmail.mockResolvedValue({ data: null, error: { message: 'Invalid credentials' } })

    await expect(useAuth().signIn({ email: 'user@example.com', password: 'nope' }))
      .rejects
      .toThrow('Invalid credentials')
  })

  it('signs up through the auth client', async () => {
    signUpEmail.mockResolvedValue({ data: {}, error: null })

    await useAuth().signUp({ name: 'A', email: 'user@example.com', password: 'longenough' })

    expect(signUpEmail).toHaveBeenCalledWith({ name: 'A', email: 'user@example.com', password: 'longenough' })
  })

  it('signs out through the auth client', async () => {
    signOut.mockResolvedValue({ data: {}, error: null })

    await useAuth().signOut()

    expect(signOut).toHaveBeenCalled()
  })
})
