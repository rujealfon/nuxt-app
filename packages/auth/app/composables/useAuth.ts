import type { SessionUser } from '@mysite/types'

export function useAuth() {
  const user = useState<SessionUser | null>('auth.user', () => null)
  const { apiBase } = useSite()

  async function fetchSession(): Promise<SessionUser | null> {
    try {
      user.value = await $fetch<SessionUser>('/auth/session', {
        baseURL: apiBase,
        credentials: 'include',
      })
    }
    catch {
      user.value = null
    }
    return user.value
  }

  async function login(email: string, password: string): Promise<SessionUser> {
    user.value = await $fetch<SessionUser>('/auth/login', {
      baseURL: apiBase,
      method: 'POST',
      credentials: 'include',
      body: { email, password },
    })
    return user.value
  }

  async function logout(): Promise<void> {
    await $fetch('/auth/logout', {
      baseURL: apiBase,
      method: 'POST',
      credentials: 'include',
    })
    user.value = null
  }

  return { user, fetchSession, login, logout }
}
