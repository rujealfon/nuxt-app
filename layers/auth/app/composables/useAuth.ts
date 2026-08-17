import type { AuthUser, LoginInput, RegisterInput } from '@nuxt-app/types'
import { createAuthClient, resolveAuthApiBase } from '@nuxt-app/auth'
import { defineQuery, useMutation, useQuery, useQueryCache } from '@pinia/colada'

export const authKeys = {
  me: ['auth', 'me'] as const,
}

function runtimeAuthClient() {
  const config = useRuntimeConfig()
  const apiUrl = String(config.public.apiUrl || 'http://localhost:3001')
  const pageHref = import.meta.client ? window.location.href : undefined
  return createAuthClient(resolveAuthApiBase(apiUrl, pageHref))
}

const useAuthMe = defineQuery(() => {
  return useQuery({
    key: authKeys.me,
    async query() {
      const res = await runtimeAuthClient().me()
      return res.user
    },
  })
})

export function useAuth() {
  const me = useAuthMe()
  const queryCache = useQueryCache()
  const error = ref<string | null>(null)

  function setUser(user: AuthUser | null) {
    queryCache.setQueryData(authKeys.me, user)
  }

  function fail(e: unknown): never {
    error.value = e instanceof Error ? e.message : 'Request failed'
    throw e
  }

  const loginMutation = useMutation({
    mutation: (input: LoginInput) => runtimeAuthClient().login(input),
    onSuccess(res) {
      setUser(res.user)
    },
  })

  const registerMutation = useMutation({
    mutation: (input: RegisterInput) => runtimeAuthClient().register(input),
  })

  async function fetchUser() {
    error.value = null
    await me.refetch()
    return me.data.value ?? null
  }

  async function login(email: string, password: string) {
    error.value = null
    try {
      return await loginMutation.mutateAsync({ email, password })
    }
    catch (e) {
      fail(e)
    }
  }

  async function register(email: string, password: string, name: string) {
    error.value = null
    try {
      return await registerMutation.mutateAsync({ email, password, name })
    }
    catch (e) {
      fail(e)
    }
  }

  async function logout(redirectTo = '/login') {
    await runtimeAuthClient().logout()
    setUser(null)
    if (redirectTo)
      await navigateTo(redirectTo)
  }

  /** refresh() respects staleTime (30s); a revoked/demoted session can pass guards until then. */
  async function ensureUser() {
    await me.refresh()
    return me.data.value ?? null
  }

  const user = computed(() => me.data.value ?? null)

  return {
    user,
    loading: computed(() => me.status.value === 'pending'),
    error,
    fetchUser,
    login,
    register,
    logout,
    ensureUser,
    isAuthenticated: computed(() => !!me.data.value),
    isAdmin: computed(() => me.data.value?.role === 'admin'),
  }
}
