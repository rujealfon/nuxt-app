import type { Actor, LoginCredentials, RegisterCredentials } from '@nuxt-app/types'
import { isBearerTransport } from '@nuxt-app/config'
import { actorFromSession } from '@nuxt-app/types'
import { createAuthClient } from 'better-auth/vue'
import { computed, getCurrentScope } from 'vue'
import { useRuntimeConfig } from '#imports'
import { authRequestError } from '../lib/authError'
import { clearAuthToken } from '../lib/authToken'
import { createSessionTransport } from '../lib/sessionTransport'

let client: ReturnType<typeof createAuthClient> | undefined
let clientKey = ''

function useAuthClient() {
  const config = useRuntimeConfig()
  const bearer = isBearerTransport(config.public.sessionTransport)
  const transport = createSessionTransport(config.public.apiBase, bearer)

  if (!client || clientKey !== transport.clientKey) {
    client = createAuthClient({
      baseURL: config.public.apiBase,
      // The transports differ in credentials and token handling, not endpoints.
      fetchOptions: transport.authClientOptions,
    })
    clientKey = transport.clientKey
  }

  return client
}

export function useAuth() {
  const client = useAuthClient()
  const bearer = isBearerTransport(useRuntimeConfig().public.sessionTransport)

  // A route guard runs outside a Vue effect scope, so subscribing there would
  // leak a session listener on every navigation. Only bind the reactive store
  // where Vue can dispose it; `getActor` works without the subscription.
  const session = getCurrentScope() ? client.useSession() : undefined

  const actor = computed(() => actorFromSession(session?.value.data))

  // Imperative, fresh fetch for navigation guards: the reactive store reflects
  // the last known session, while a gate needs a current answer.
  async function getActor(): Promise<Actor | null> {
    const { data } = await client.getSession()
    return actorFromSession(data)
  }

  async function signIn(credentials: LoginCredentials) {
    const { error } = await client.signIn.email(credentials)

    if (error) {
      throw authRequestError(error)
    }
  }

  async function signUp(credentials: RegisterCredentials) {
    const { error } = await client.signUp.email(credentials)

    if (error) {
      throw authRequestError(error)
    }
  }

  async function signOut() {
    try {
      await client.signOut()
    }
    finally {
      // Attempt local cleanup even when revocation fails. Storage failures
      // invalidate local reads and reject so callers can ask the user to retry.
      if (bearer) {
        await clearAuthToken()
      }
    }
  }

  return {
    actor,
    getActor,
    signIn,
    signUp,
    signOut,
  }
}
