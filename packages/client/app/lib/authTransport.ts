import { readAuthToken, writeAuthToken } from './authToken'

// The auth client's fetch options for each session transport.
//
// Kept out of `useAuth` so both transports are testable as plain values,
// without a Nuxt runtime or a mounted component.
export interface AuthFetchOptions {
  credentials: RequestCredentials
  auth?: {
    type: 'Bearer'
    token: () => Promise<string>
  }
  onSuccess?: (context: { response: Response }) => Promise<void>
}

// The shape ofetch hands a request hook. `headers` is declared as the loose
// `HeadersInit` ofetch promises, not the `Headers` it actually normalizes to.
export interface BearerRequestContext {
  options: {
    headers?: HeadersInit
  }
}

// Adds the bearer header to one outgoing versioned-route request. ofetch
// normalizes `headers` to a `Headers` instance before running hooks, so a
// replaced copy is enough. The token is read per request: it only exists once
// a sign-in has succeeded.
export async function setBearerAuthorization(context: BearerRequestContext) {
  const token = await readAuthToken()

  if (token) {
    const headers = new Headers(context.options.headers)
    headers.set('Authorization', `Bearer ${token}`)
    context.options.headers = headers
  }
}

export function authFetchOptions(bearer: boolean): AuthFetchOptions {
  if (!bearer) {
    return { credentials: 'include' }
  }

  return {
    // The token *is* the session in bearer mode, so cookies are neither sent
    // nor accepted. Depending on them is exactly what fails in a WebView.
    credentials: 'omit',
    auth: {
      type: 'Bearer',
      token: async () => (await readAuthToken()) ?? '',
    },
    // Every response that creates or refreshes a session carries the token in
    // `set-auth-token`; keep it for the requests that follow. The CORS
    // middleware has to expose that header or this reads `null` forever.
    onSuccess: async (context) => {
      const token = context.response.headers.get('set-auth-token')

      if (token) {
        await writeAuthToken(token)
      }
    },
  }
}
