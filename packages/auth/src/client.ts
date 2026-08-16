import type { AuthUser, LoginInput, RegisterInput, AuthResponse } from '@mysite/types'

function getApiUrl(): string {
  // Nuxt runtime config
  if (typeof useRuntimeConfig === 'function') {
    try {
      const config = useRuntimeConfig()
      if (config.public?.apiUrl) return config.public.apiUrl as string
    } catch {
      // outside of Nuxt context
    }
  }
  // Vite / generic
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) {
    return (import.meta as any).env.VITE_API_URL
  }
  return 'http://localhost:3001'
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Request failed')
  }

  return data as T
}

export const authClient = {
  async login(input: LoginInput): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async register(input: RegisterInput): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async logout(): Promise<{ message: string }> {
    return request('/auth/logout', { method: 'POST' })
  },

  async me(): Promise<{ user: AuthUser | null }> {
    try {
      return await request('/auth/me')
    } catch {
      return { user: null }
    }
  },
}
