import type { AppType } from '@nuxt-app/api/rpc'
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from '@nuxt-app/types'
import { messageFromFailedBody } from '@nuxt-app/types'
import { hc } from 'hono/client'

function normalizeBase(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}

async function unwrap<T>(res: Response): Promise<T> {
  const data = await res.json() as T
  if (!res.ok)
    throw new Error(messageFromFailedBody(data))
  return data
}

export function createAuthClient(baseUrl: string) {
  const client = () => hc<AppType>(normalizeBase(baseUrl), {
    init: { credentials: 'include' },
  })

  return {
    async login(input: LoginInput): Promise<AuthResponse> {
      return unwrap<AuthResponse>(await client().auth.login.$post({ json: input }))
    },

    async register(input: RegisterInput): Promise<{ message: string }> {
      return unwrap<{ message: string }>(await client().auth.register.$post({ json: input }))
    },

    async logout(): Promise<{ message: string }> {
      return unwrap<{ message: string }>(await client().auth.logout.$post())
    },

    async me(): Promise<{ user: AuthUser | null }> {
      return unwrap<{ user: AuthUser | null }>(await client().auth.me.$get())
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
