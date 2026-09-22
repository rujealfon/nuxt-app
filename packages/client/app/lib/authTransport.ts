import { captureIssuedToken, clearAuthToken, readAuthToken } from './authToken'

// The auth client's fetch options for each session transport. Kept out of
// `useAuth` so both transports are testable as plain values, without a Nuxt
// runtime or a mounted component. See ADR-0003.
//
// These shapes mirror what better-fetch/ofetch pass to the hooks.
export interface AuthFetchOptions {
  credentials: RequestCredentials
  auth?: {
    type: 'Bearer'
    token: () => Promise<string>
  }
  onSuccess?: (context: { response: Response }) => Promise<void>
  onResponseError?: (context: { response: { status: number } }) => Promise<void>
}

// The shape ofetch hands a request hook. `headers` is declared as the loose
// `HeadersInit` ofetch promises, not the `Headers` it actually normalizes to.
export interface BearerRequestContext {
  options: {
    headers?: HeadersInit
  }
}

// Adds the bearer header to one outgoing versioned-route request. The token is
// read per request: it only exists once a sign-in has succeeded.
export async function setBearerAuthorization(context: BearerRequestContext) {
  const token = await readAuthToken()

  if (token) {
    const headers = new Headers(context.options.headers)
    headers.set('Authorization', `Bearer ${token}`)
    context.options.headers = headers
  }
}

// A 401 means the stored token no longer names a session. Drop it so a dead
// credential does not linger across launches.
export async function clearStaleBearer(context: { response: { status: number } }) {
  if (context.response.status === 401) {
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
    onResponseError: clearStaleBearer,
  }
}

// Fetch options for the versioned-route client (`useApi`), the counterpart to
// `authFetchOptions`. Kept here so the transport wiring is unit-testable
// without a Nuxt runtime.
export interface ApiFetchOptions {
  credentials: RequestCredentials
  onRequest?: (context: BearerRequestContext) => Promise<void>
  onResponseError?: (context: { response: { status: number } }) => Promise<void>
}

export function apiFetchOptions(bearer: boolean): ApiFetchOptions {
  if (!bearer) {
    return { credentials: 'include' }
  }

  return {
    credentials: 'omit',
    onRequest: setBearerAuthorization,
    onResponseError: clearStaleBearer,
  }
}
