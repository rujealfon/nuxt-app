import type { Actor } from '@nuxt-app/types'
import type { H3Event } from 'h3'
import { actorFromSession } from '@nuxt-app/types'
import { useAuth } from './auth'
import { domainFailure } from './domain-failure'

// Reads the raw session for a request. Production backs this with Better Auth;
// tests substitute an in-memory source, so the gate is exercised through its
// own interface instead of a mocked module.
export type SessionSource = (event: H3Event) => Promise<unknown>

const betterAuthSession: SessionSource = event =>
  useAuth().api.getSession({ headers: event.headers })

export interface ActorGate {
  getActor: (event: H3Event) => Promise<Actor | null>
  requireActor: (event: H3Event) => Promise<Actor>
}

// The trusted actor context for a request. Unknown roles normalize to `user`,
// never up; a session that is missing or not an actor is no actor.
export function createActorGate(source: SessionSource = betterAuthSession): ActorGate {
  async function getActor(event: H3Event): Promise<Actor | null> {
    return actorFromSession(await source(event))
  }

  // The only gate for authenticated endpoints. Throws a domain failure when
  // there is no actor; add role checks where the operation requires them.
  async function requireActor(event: H3Event): Promise<Actor> {
    const actor = await getActor(event)

    if (!actor) {
      throw domainFailure('unauthenticated')
    }

    return actor
  }

  return { getActor, requireActor }
}

export const { getActor, requireActor } = createActorGate()
