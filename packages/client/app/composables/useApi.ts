import { parseApiError } from '@nuxt-app/types'
import { $fetch, useRuntimeConfig } from '#imports'
import { setBearerAuthorization } from '../lib/authTransport'

type ApiClient = typeof $fetch

let client: ApiClient | undefined
let clientBaseURL = ''
let clientBearer = false

// $fetch throws a FetchError whose `data` is the JSON body. Better Auth
// failures are a different shape and must not parse as the API error contract.
function apiErrorFromCaught(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error) {
    const fromBody = parseApiError(error.data)
    if (fromBody) {
      return fromBody
    }
  }

  return parseApiError(error)
}

// Versioned-route client. Better Auth keeps its own unversioned client
// (inside `useAuth`); this is for `/api/<version>/*`.
export function useApi() {
  const config = useRuntimeConfig()
  const baseURL = `${config.public.apiBase}/api/${config.public.apiVersion}`
  const bearer = config.public.authMode === 'bearer'

  if (!client || clientBaseURL !== baseURL || clientBearer !== bearer) {
    client = $fetch.create({
      baseURL,
      credentials: bearer ? 'omit' : 'include',
      // The API gate resolves the actor from the same `Authorization` header
      // the auth client uses, so versioned routes follow the session transport
      // without any per-call wiring.
      onRequest: bearer ? setBearerAuthorization : undefined,
    })
    clientBaseURL = baseURL
    clientBearer = bearer
  }

  return {
    api: client,
    apiUrl: (path: string) => `${baseURL}${path}`,
    parseApiError: apiErrorFromCaught,
  }
}
