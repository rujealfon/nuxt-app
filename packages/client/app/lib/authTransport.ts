import type { BetterAuthClientOptions } from 'better-auth'
import type { FetchContext, FetchOptions, FetchResponse } from 'ofetch'
import { captureIssuedToken, clearAuthToken, readAuthToken } from './authToken'

type AuthFetchOptions = NonNullable<BetterAuthClientOptions['fetchOptions']>
type ApiFetchOptions = FetchOptions
type ApiResponseContext = FetchContext & { response: FetchResponse<unknown> }

// Adds the bearer header to one outgoing versioned-route request. The token is
// read per request: it only exists once a sign-in has succeeded.
export async function setBearerAuthorization(options: { headers?: HeadersInit }) {
  const token = await readAuthToken()

  if (token) {
    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${token}`)
    options.headers = headers
  }
}

// An old request must not clear a token saved by a newer sign-in.
export async function clearStaleBearer(status: number, headers?: HeadersInit) {
  const authorization = new Headers(headers).get('authorization')
  const token = authorization?.match(/^Bearer (.+)$/i)?.[1]
  if (status === 401 && token) {
    await clearAuthToken(token)
  }
}

export function authFetchOptions(bearer: boolean): AuthFetchOptions {
  if (!bearer) {
    return { credentials: 'include' }
  }

  return {
    // The token *is* the session in bearer mode, so cookies are neither sent
    // nor accepted.
    credentials: 'omit',
    auth: {
      type: 'Bearer',
      token: async () => (await readAuthToken()) ?? '',
    },
    onSuccess: async context => captureIssuedToken(context.response),
    onError: async (context) => {
      // Other auth endpoints can reject credentials without invalidating the
      // current session, for example an incorrect password during sign-in.
      if (new URL(context.request.url).pathname.endsWith('/get-session')) {
        await clearStaleBearer(context.response.status, context.request.headers)
      }
    },
  }
}

export function apiFetchOptions(bearer: boolean): ApiFetchOptions {
  if (!bearer) {
    return { credentials: 'include' }
  }

  const options = {
    credentials: 'omit',
    onRequest: async (context: FetchContext) => setBearerAuthorization(context.options),
    onResponseError: async (context: ApiResponseContext) => clearStaleBearer(context.response.status, context.options.headers),
  } satisfies ApiFetchOptions

  return options
}

// Cache key for a configured API client: one per origin + transport. Pure, so
// the key is testable without a Nuxt environment.
export function apiClientKey(baseURL: string, bearer: boolean): string {
  return `${baseURL}|${bearer ? 'bearer' : 'cookie'}`
}
