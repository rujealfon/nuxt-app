import type { Actor, LoginCredentials, RegisterCredentials } from '@nuxt-app/types'
import { isBearerTransport } from '@nuxt-app/config'
import { actorFromSession } from '@nuxt-app/types'
import { createAuthClient } from 'better-auth/vue'
import { computed, getCurrentScope } from 'vue'
import { useRuntimeConfig } from '#imports'
import { clearAuthToken } from '../lib/authToken'
import { authFetchOptions } from '../lib/authTransport'

let client: ReturnType<typeof createAuthClient> | undefined
let clientKey = ''

function useAuthClient() {
  const config = useRuntimeConfig()
  const bearer = isBearerTransport(config.public.sessionTransport)
  const key = `${config.public.apiBase}|${bearer ? 'bearer' : 'cookie'}`

  if (!client || clientKey !== key) {
    client = createAuthClient({
      baseURL: config.public.apiBase,
      // The transports differ in credentials and token handling, not endpoints.
      fetchOptions: authFetchOptions(bearer),
    })
    clientKey = key
  }

  return client
}

export function useAuth() {
  const client = useAuthClient()

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
      throw new Error(error.message || 'Unable to sign in')
    }
  }

  async function signUp(credentials: RegisterCredentials) {
    const { error } = await client.signUp.email(credentials)

    if (error) {
      throw new Error(error.message || 'Unable to sign up')
    }
  }

  async function signOut() {
    try {
      await client.signOut()
    }
    finally {
      // Local logout must not depend on the server: clear the stored token even
      // when revocation fails, so the device holds no usable credential. A
      // cookie-mode client has nothing stored and this is a no-op.
      await clearAuthToken()
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
