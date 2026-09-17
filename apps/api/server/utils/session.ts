import type { Actor } from '@nuxt-app/types'
import type { H3Event } from 'h3'
import { actorSchema } from '@nuxt-app/types'

// The trusted actor context for this request, narrowed to the shared actor
// contract. An unrecognised session shape or role resolves to no actor at all.
export async function getActor(event: H3Event): Promise<Actor | null> {
  const session = await useAuth().api.getSession({ headers: event.headers })

  if (!session?.user) {
    return null
  }

  const parsed = actorSchema.safeParse(session.user)
  return parsed.success ? parsed.data : null
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
