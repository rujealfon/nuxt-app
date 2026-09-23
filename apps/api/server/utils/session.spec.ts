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

const { createActorGate, getActor, requireActor } = await import('./session')

const { getSession } = mocks

const event = { headers: new Headers() } as never

function sessionUser(user: unknown) {
  return { session: { id: 'session-1' }, user }
}

function inMemory(session: unknown) {
  return async () => session
}

describe('createActorGate with an in-memory source', () => {
  it('narrows the session user to the actor contract', async () => {
    const gate = createActorGate(inMemory(sessionUser({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'admin',
    })))

    await expect(gate.getActor(event)).resolves.toEqual({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'admin',
    })
  })

  it('defaults an unknown role to user', async () => {
    const gate = createActorGate(inMemory(sessionUser({
      id: 'user-1',
      email: 'user@example.com',
      name: null,
      role: 'owner',
    })))

    await expect(gate.getActor(event)).resolves.toMatchObject({ role: 'user' })
  })

  it('returns null without a session', async () => {
    const gate = createActorGate(inMemory(null))

    await expect(gate.getActor(event)).resolves.toBeNull()
  })

  it('returns the actor from requireActor', async () => {
    const gate = createActorGate(inMemory(sessionUser({
      id: 'user-1',
      email: 'user@example.com',
      name: null,
      role: 'user',
    })))

    await expect(gate.requireActor(event)).resolves.toMatchObject({ id: 'user-1', role: 'user' })
  })

  it('throws a domain failure from requireActor without a session', async () => {
    const gate = createActorGate(inMemory(null))

    const caught = await gate.requireActor(event).then(
      () => {
        throw new Error('expected requireActor to throw')
      },
      (error: unknown) => error,
    )

    expect(caught).toBeInstanceOf(DomainFailure)
    expect((caught as DomainFailure).error).toBe('unauthenticated')
  })
})

// The bearer transport rides on this: the gate has to hand the raw request
// headers (including `Authorization`) to Better Auth, or native clients are
// unauthenticated on every route.
describe('the production session source', () => {
  beforeEach(() => {
    getSession.mockReset()
  })

  it('forwards the request headers to the session lookup', async () => {
    getSession.mockResolvedValue(null)
    const headers = new Headers({ authorization: 'Bearer session-token' })

    await getActor({ headers } as never)

    expect(getSession).toHaveBeenCalledWith({ headers })
  })

  it('backs the exported gate', async () => {
    getSession.mockResolvedValue(sessionUser({
      id: 'user-1',
      email: 'user@example.com',
      name: null,
      role: 'user',
    }))

    await expect(requireActor(event)).resolves.toMatchObject({ id: 'user-1', role: 'user' })
  })
})
