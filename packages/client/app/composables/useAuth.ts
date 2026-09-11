import type { SessionUser } from '@mysite/types'

export interface LoginCredentials {
  email: string
  password: string
}

const SESSION_QUERY_KEY = ['auth', 'session'] as const

export function useSessionQuery() {
  const config = useRuntimeConfig()

  return useQuery({
    key: SESSION_QUERY_KEY,
    query: async ({ signal }) => {
      try {
        return await $fetch<SessionUser>('/api/auth/session', {
          baseURL: config.public.apiBase,
          credentials: 'include',
          signal,
        })
      }
      catch (error) {
        // A missing session is a valid "signed out" state, not an error.
        if ((error as { statusCode?: number }).statusCode === 401) {
          return null
        }
        throw error
      }
    },
  })
}

export function useAuth() {
  const config = useRuntimeConfig()
  const queryCache = useQueryCache()

  const session = useSessionQuery()
  const user = computed(() => session.data.value ?? null)

  const login = useMutation({
    mutation: (credentials: LoginCredentials) =>
      $fetch<SessionUser>('/api/auth/login', {
        baseURL: config.public.apiBase,
        method: 'POST',
        credentials: 'include',
        body: credentials,
      }),
    onSuccess(signedInUser) {
      queryCache.setQueryData(SESSION_QUERY_KEY, signedInUser)
    },
  })

  const logout = useMutation({
    mutation: () =>
      $fetch('/api/auth/logout', {
        baseURL: config.public.apiBase,
        method: 'POST',
        credentials: 'include',
      }),
    onSuccess() {
      queryCache.setQueryData(SESSION_QUERY_KEY, null)
    },
  })

  return { user, session, login, logout }
}
