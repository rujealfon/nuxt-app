import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from '@nuxt-app/types'
import {
  authHttp,
  authResponseSchema,
  meResponseSchema,
  messageFromFailedBody,
  messageResponseSchema,
} from '@nuxt-app/types'
import { resolveAuthApiBase } from './api-url'

function joinUrl(baseUrl: string, path: string) {
  const suffix = path.replace(/^\//, '')
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  if (base.startsWith('/'))
    return `${base}${suffix}`
  return new URL(suffix, base).toString()
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  }
  catch {
    throw new Error('Request failed')
  }
}

async function unwrap<T>(
  res: Response,
  schema: { safeParse: (data: unknown) => { success: true, data: T } | { success: false } },
): Promise<T> {
  const data = await readJson(res)
  if (!res.ok)
    throw new Error(messageFromFailedBody(data))

  const parsed = schema.safeParse(data)
  if (!parsed.success)
    throw new Error('Invalid response')

  return parsed.data
}

async function request<T>(
  baseUrl: string,
  path: string,
  schema: { safeParse: (data: unknown) => { success: true, data: T } | { success: false } },
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')

  const res = await fetch(joinUrl(baseUrl, path), {
    ...init,
    credentials: 'include',
    headers,
  })
  return unwrap(res, schema)
}

export function createAuthClient(apiUrl: string, pageHref?: string) {
  const baseUrl = resolveAuthApiBase(apiUrl, pageHref)
  return {
    login(input: LoginInput): Promise<AuthResponse> {
      return request(baseUrl, authHttp.login.path, authResponseSchema, {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },

    register(input: RegisterInput): Promise<{ message: string }> {
      return request(baseUrl, authHttp.register.path, messageResponseSchema, {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },

    logout(): Promise<{ message: string }> {
      return request(baseUrl, authHttp.logout.path, messageResponseSchema, { method: 'POST' })
    },

    me(): Promise<{ user: AuthUser | null }> {
      return request(baseUrl, authHttp.me.path, meResponseSchema)
    },
  }
}

export type AuthClient = ReturnType<typeof createAuthClient>
