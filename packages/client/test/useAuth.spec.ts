import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../app/composables/useAuth'

const signInEmail = vi.fn()
const signUpEmail = vi.fn()
const signOut = vi.fn()
const getSession = vi.fn()
const useSession = vi.fn(() => ({
  value: { data: null, isPending: false },
}))

vi.mock('better-auth/vue', () => ({
  createAuthClient: () => ({
    useSession,
    getSession,
    signIn: { email: signInEmail },
    signUp: { email: signUpEmail },
    signOut,
  }),
}))

beforeEach(() => {
  signInEmail.mockReset()
  signUpEmail.mockReset()
  signOut.mockReset()
  getSession.mockReset()
  useSession.mockClear()
  useSession.mockReturnValue({ value: { data: null, isPending: false } })
})

describe('useAuth', () => {
  it('exposes the actor with a typed role', () => {
    useSession.mockReturnValue({
      value: {
        data: { user: { id: 'user-1', email: 'user@example.com', name: null, role: 'admin' } },
        isPending: false,
      },
    })

    expect(useAuth().actor.value).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      name: null,
      role: 'admin',
    })
  })

  it('defaults an unknown role to user', () => {
    useSession.mockReturnValue({
      value: { data: { user: { id: 'u', email: 'user@example.com', name: null, role: 'owner' } }, isPending: false },
    })

    expect(useAuth().actor.value).toMatchObject({ role: 'user' })
  })

  it('returns null without a session', () => {
    expect(useAuth().actor.value).toBeNull()
  })

  it('fetches the actor imperatively through getActor', async () => {
    getSession.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com', name: 'Ada', role: 'admin' } },
    })

    await expect(useAuth().getActor()).resolves.toEqual({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Ada',
      role: 'admin',
    })
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
