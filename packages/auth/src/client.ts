import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from '@nuxt-app/types'
import { messageFromFailedBody } from '@nuxt-app/types'

function joinUrl(baseUrl: string, path: string) {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return new URL(path.replace(/^\//, ''), base).toString()
}

async function unwrap<T>(res: Response): Promise<T> {
  const data = await res.json() as T
  if (!res.ok)
    throw new Error(messageFromFailedBody(data))
  return data
}

async function request<T>(baseUrl: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')

  const res = await fetch(joinUrl(baseUrl, path), {
    ...init,
    credentials: 'include',
    headers,
  })
  return unwrap(res)
}

export function createAuthClient(baseUrl: string) {
  return {
    login(input: LoginInput): Promise<AuthResponse> {
      return request<AuthResponse>(baseUrl, 'auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },

    register(input: RegisterInput): Promise<{ message: string }> {
      return request<{ message: string }>(baseUrl, 'auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },

    logout(): Promise<{ message: string }> {
      return request<{ message: string }>(baseUrl, 'auth/logout', { method: 'POST' })
    },

    me(): Promise<{ user: AuthUser | null }> {
      return request<{ user: AuthUser | null }>(baseUrl, 'auth/me')
    },
  }
}

export type AuthClient = ReturnType<typeof createAuthClient>

let defaultClient = createAuthClient('http://localhost:3001')

export function setAuthApiUrl(url: string) {
  defaultClient = createAuthClient(url)
}

export const authClient: AuthClient = {
  login: input => defaultClient.login(input),
  register: input => defaultClient.register(input),
  logout: () => defaultClient.logout(),
  me: () => defaultClient.me(),
}
