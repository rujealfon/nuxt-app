import type { AppType } from '@nuxt-app/api/rpc'
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from '@nuxt-app/types'
import { hc } from 'hono/client'

let apiUrlOverride: string | undefined

export function setAuthApiUrl(url: string) {
  apiUrlOverride = url
}

function getApiUrl(): string {
  if (apiUrlOverride)
    return apiUrlOverride
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL)
    return (import.meta as any).env.VITE_API_URL
  return 'http://localhost:3001'
}

function client() {
  const base = getApiUrl()
  return hc<AppType>(base.endsWith('/') ? base : `${base}/`, {
    init: { credentials: 'include' },
  })
}

interface ErrorBody {
  message?: string
  error?: string | { issues?: Array<{ message?: string }> }
}

async function unwrap<T>(res: Response): Promise<T> {
  const data = await res.json() as ErrorBody & T
  if (!res.ok) {
    const issue = typeof data.error === 'object' ? data.error.issues?.[0]?.message : data.error
    throw new Error(issue || data.message || 'Request failed')
  }
  return data
}

export const authClient = {
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
