import type { Actor, LoginCredentials, RegisterCredentials } from '@nuxt-app/types'
import { actorFromSession } from '@nuxt-app/types'
import { createAuthClient } from 'better-auth/vue'
import { computed, getCurrentScope } from 'vue'
import { useRuntimeConfig } from '#imports'

let client: ReturnType<typeof createAuthClient> | undefined

function useAuthClient() {
  if (!client) {
    const config = useRuntimeConfig()
    client = createAuthClient({
      baseURL: config.public.apiBase,
      fetchOptions: {
        credentials: 'include',
      },
    })
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
    await client.signOut()
  }

  return {
    actor,
    getActor,
    signIn,
    signUp,
    signOut,
  }
}
