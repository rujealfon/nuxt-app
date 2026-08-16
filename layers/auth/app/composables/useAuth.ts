import type { AuthUser } from '@nuxt-app/types'
import { authClient } from '@nuxt-app/auth/client'

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const loading = useState('auth-loading', () => true)
  const error = useState<string | null>('auth-error', () => null)

  async function fetchUser() {
    loading.value = true
    error.value = null
    try {
      const res = await authClient.me()
      user.value = res.user
    }
    catch {
      user.value = null
    }
    finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string) {
    error.value = null
    try {
      const res = await authClient.login({ email, password })
      user.value = res.user
      return res
    }
    catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function register(email: string, password: string, name: string) {
    error.value = null
    try {
      const res = await authClient.register({ email, password, name })
      user.value = res.user
      return res
    }
    catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function logout(redirectTo = '/login') {
    await authClient.logout()
    user.value = null
    if (redirectTo) {
      await navigateTo(redirectTo)
    }
  }

  async function ensureUser() {
    if (loading.value) {
      await fetchUser()
    }
    return user.value
  }

  return {
    user,
    loading,
    error,
    fetchUser,
    login,
    register,
    logout,
    ensureUser,
    isAuthenticated: computed(() => !!user.value),
    isAdmin: computed(() => user.value?.role === 'admin'),
  }
}
