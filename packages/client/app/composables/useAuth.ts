import type { LoginCredentials } from '@mysite/types'
import { createAuthClient } from 'better-auth/vue'

let client: ReturnType<typeof createAuthClient> | undefined

export function useAuthClient() {
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
  const session = client.useSession()

  const user = computed(() => session.value.data?.user ?? null)
  const isPending = computed(() => session.value.isPending)

  async function signIn(credentials: LoginCredentials) {
    const { error } = await client.signIn.email(credentials)

    if (error) {
      throw new Error(error.message || 'Unable to sign in')
    }
  }

  async function signOut() {
    await client.signOut()
  }

  return {
    user,
    session,
    isPending,
    signIn,
    signOut,
  }
}
