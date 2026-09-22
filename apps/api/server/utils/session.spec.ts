import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DomainFailure } from './domain-failure'

const mocks = vi.hoisted(() => {
  const getSession = vi.fn()
  return {
    getSession,
    useAuth: vi.fn(() => ({ api: { getSession } })),
  }
})

vi.mock('./auth', () => ({ useAuth: mocks.useAuth }))

const { getActor, requireActor } = await import('./session')

const { getSession } = mocks

const event = { headers: new Headers() } as never

function sessionUser(user: unknown) {
  return { session: { id: 'session-1' }, user }
}

describe('getActor', () => {
  beforeEach(() => {
    getSession.mockReset()
  })

  it('narrows the session user to the actor contract', async () => {
    getSession.mockResolvedValue(sessionUser({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'admin',
    }))

    await expect(getActor(event)).resolves.toEqual({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'admin',
    })
  })

  it('defaults an unknown role to user', async () => {
    getSession.mockResolvedValue(sessionUser({
      id: 'user-1',
      email: 'user@example.com',
      name: null,
      role: 'owner',
    }))

    await expect(getActor(event)).resolves.toMatchObject({ role: 'user' })
  })

  it('returns null without a session', async () => {
    getSession.mockResolvedValue(null)

    await expect(getActor(event)).resolves.toBeNull()
  })

  // The bearer transport rides on this: the gate has to hand the raw request
  // headers (including `Authorization`) to Better Auth, or native clients are
  // unauthenticated on every route.
  it('forwards the request headers to the session lookup', async () => {
    getSession.mockResolvedValue(null)
    const headers = new Headers({ authorization: 'Bearer session-token' })

    await getActor({ headers } as never)

    expect(getSession).toHaveBeenCalledWith({ headers })
  })
})

describe('requireActor', () => {
  beforeEach(() => {
    getSession.mockReset()
  })

  it('returns the actor for a session', async () => {
    getSession.mockResolvedValue(sessionUser({
      id: 'user-1',
      email: 'user@example.com',
      name: null,
      role: 'user',
    }))

    await expect(requireActor(event)).resolves.toMatchObject({ id: 'user-1', role: 'user' })
  })

  it('throws a domain failure without a session', async () => {
    getSession.mockResolvedValue(null)

    const caught = await requireActor(event).then(
      () => {
        throw new Error('expected requireActor to throw')
      },
      (error: unknown) => error,
    )

    expect(caught).toBeInstanceOf(DomainFailure)
    expect((caught as DomainFailure).error).toBe('unauthenticated')
  })
})
