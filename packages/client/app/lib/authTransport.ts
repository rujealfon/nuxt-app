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

// A 401 means the stored token no longer names a session. Drop it so a dead
// credential does not linger across launches.
export async function clearStaleBearer(status: number) {
  if (status === 401) {
    await clearAuthToken()
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
    onError: async context => clearStaleBearer(context.response.status),
  }
}

export function apiFetchOptions(bearer: boolean): ApiFetchOptions {
  if (!bearer) {
    return { credentials: 'include' }
  }

  const options = {
    credentials: 'omit',
    onRequest: async (context: FetchContext) => setBearerAuthorization(context.options),
    onResponseError: async (context: ApiResponseContext) => clearStaleBearer(context.response.status),
  } satisfies ApiFetchOptions

  return options
}
