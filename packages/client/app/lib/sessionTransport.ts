import type { BetterAuthClientOptions } from 'better-auth'
import type { FetchContext, FetchOptions, FetchResponse } from 'ofetch'
import { sessionEndpoint } from '@nuxt-app/config'
import { captureIssuedToken, clearAuthToken, readAuthToken } from './authToken'

type AuthFetchOptions = NonNullable<BetterAuthClientOptions['fetchOptions']>
type ApiFetchOptions = FetchOptions
type ApiResponseContext = FetchContext & { response: FetchResponse<unknown> }

// One configured session transport. Callers learn four members; cookie/bearer
// branching, token capture, stale clearing, and the origin check stay inside.
export interface SessionTransport {
  authClientOptions: AuthFetchOptions
  apiClientOptions: ApiFetchOptions
  clientKey: string
  isConfiguredOrigin: (request: FetchContext['request'], requestBaseURL: string | undefined) => boolean
}

function targetsConfiguredOrigin(
  request: FetchContext['request'],
  requestBaseURL: string | undefined,
  configuredBaseURL: string,
): boolean {
  const requestURL = new URL(
    typeof request === 'string' ? request : request.url,
    requestBaseURL || configuredBaseURL,
  )

  return requestURL.origin === new URL(configuredBaseURL).origin
}

// Adds the bearer header to one outgoing versioned-route request. The token is
// read per request: it only exists once a sign-in has succeeded.
async function setBearerAuthorization(options: { headers?: HeadersInit }) {
  const token = await readAuthToken()

  if (token) {
    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${token}`)
    options.headers = headers
  }
}

// An old request must not clear a token saved by a newer sign-in.
async function clearStaleBearer(status: number, headers?: HeadersInit) {
  const authorization = new Headers(headers).get('authorization')
  const token = authorization?.match(/^Bearer (.+)$/i)?.[1]
  if (status === 401 && token) {
    await clearAuthToken(token)
  }
}

function authFetchOptions(bearer: boolean): AuthFetchOptions {
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
      if (new URL(context.request.url).pathname.endsWith(sessionEndpoint)) {
        await clearStaleBearer(context.response.status, context.request.headers)
      }
    },
  }
}

function apiFetchOptions(baseURL: string, bearer: boolean): ApiFetchOptions {
  if (!bearer) {
    return { credentials: 'include' }
  }

  const options = {
    credentials: 'omit',
    onRequest: async (context: FetchContext) => {
      if (targetsConfiguredOrigin(context.request, context.options.baseURL, baseURL)) {
        await setBearerAuthorization(context.options)
      }
    },
    onResponseError: async (context: ApiResponseContext) => {
      if (targetsConfiguredOrigin(context.request, context.options.baseURL, baseURL)) {
        await clearStaleBearer(context.response.status, context.options.headers)
      }
    },
  } satisfies ApiFetchOptions

  return options
}

// Builds the cookie or bearer transport for one configured API base. The cache
// key is one per origin + transport, so adding a config dimension cannot
// silently reuse a stale client.
export function createSessionTransport(baseURL: string, bearer: boolean): SessionTransport {
  return {
    authClientOptions: authFetchOptions(bearer),
    apiClientOptions: apiFetchOptions(baseURL, bearer),
    clientKey: `${baseURL}|${bearer ? 'bearer' : 'cookie'}`,
    isConfiguredOrigin: (request, requestBaseURL) => targetsConfiguredOrigin(request, requestBaseURL, baseURL),
  }
}
