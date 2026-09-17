import type { Actor } from '@nuxt-app/types'
import type { H3Event } from 'h3'
import { actorFromSession } from '@nuxt-app/types'

// The trusted actor context for this request. Unknown roles normalize to
// `user`, never up; a session that is missing or not an actor is no actor.
export async function getActor(event: H3Event): Promise<Actor | null> {
  const session = await useAuth().api.getSession({ headers: event.headers })
  return actorFromSession(session)
}

// The only gate for authenticated endpoints. Throws a product failure when
// there is no actor; add role checks where the operation requires them.
export async function requireActor(event: H3Event): Promise<Actor> {
  const actor = await getActor(event)

  if (!actor) {
    throw productFailure('unauthenticated')
  }

  return actor
}
