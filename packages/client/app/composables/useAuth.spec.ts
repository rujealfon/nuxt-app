import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useRuntimeConfig } from '#imports'
import { resetAuthTokenStore } from '../../test/helpers/authTokenStore'
import { installAuthTokenStore, readAuthToken, writeAuthToken } from '../lib/authToken'
import { useAuth } from './useAuth'

const signInEmail = vi.fn()
const signUpEmail = vi.fn()
const signOut = vi.fn()
const getSession = vi.fn()
const useSession = vi.fn()

vi.mock('better-auth/vue', () => ({
  createAuthClient: () => ({
    useSession,
    getSession,
    signIn: { email: signInEmail },
    signUp: { email: signUpEmail },
    signOut,
  }),
}))

// The reactive store is only bound inside an effect scope (as in a component
// setup); route guards call `useAuth()` outside one on purpose.
function inScope<T>(fn: () => T): T {
  return effectScope().run(fn) as T
}

beforeEach(async () => {
  await resetAuthTokenStore()
  useRuntimeConfig().public.sessionTransport = 'bearer'
  signInEmail.mockReset()
  signUpEmail.mockReset()
  signOut.mockReset()
  getSession.mockReset()
  useSession.mockClear()
  useSession.mockReturnValue({ value: { data: null } })
})

afterEach(() => {
  useRuntimeConfig().public.sessionTransport = 'cookie'
})

describe('useAuth', () => {
  it('exposes the actor with a typed role', () => {
    useSession.mockReturnValue({
      value: {
        data: { user: { id: 'user-1', email: 'user@example.com', name: null, role: 'admin' } },
      },
    })

    expect(inScope(() => useAuth().actor.value)).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      name: null,
      role: 'admin',
    })
  })

  it('defaults an unknown role to user', () => {
    useSession.mockReturnValue({
      value: { data: { user: { id: 'u', email: 'user@example.com', name: null, role: 'owner' } } },
    })

    expect(inScope(() => useAuth().actor.value)).toMatchObject({ role: 'user' })
  })

  it('returns null without a session', () => {
    expect(inScope(() => useAuth().actor.value)).toBeNull()
  })

  it('does not subscribe to the session store outside an effect scope', () => {
    useAuth()

    expect(useSession).not.toHaveBeenCalled()
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

  it('clears the stored token on sign out', async () => {
    await writeAuthToken('session-token')
    signOut.mockResolvedValue({ data: {}, error: null })

    await useAuth().signOut()

    await expect(readAuthToken()).resolves.toBeNull()
  })

  it('clears the stored token even when sign out fails', async () => {
    await writeAuthToken('session-token')
    signOut.mockRejectedValue(new Error('network down'))

    await expect(useAuth().signOut()).rejects.toThrow('network down')
    await expect(readAuthToken()).resolves.toBeNull()
  })

  it('reports failed local cleanup and stops using the saved credential', async () => {
    installAuthTokenStore({
      read: async () => 'old-session',
      write: async () => {},
      clear: async () => { throw new Error('storage unavailable') },
    })
    signOut.mockResolvedValue({ error: { message: 'Server unavailable' } })

    await expect(useAuth().signOut()).rejects.toThrow('Unable to remove')
    await expect(readAuthToken()).resolves.toBeNull()
  })

  it('does not access token storage when signing out with cookies', async () => {
    useRuntimeConfig().public.sessionTransport = 'cookie'
    const clear = vi.fn().mockRejectedValue(new Error('storage blocked'))
    installAuthTokenStore({ read: async () => null, write: async () => {}, clear })
    signOut.mockResolvedValue({ data: {}, error: null })

    await useAuth().signOut()

    expect(clear).not.toHaveBeenCalled()
  })
})
