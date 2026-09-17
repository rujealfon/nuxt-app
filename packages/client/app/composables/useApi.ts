import { parseApiError as parseApiErrorBody } from '@nuxt-app/types'

type ApiClient = typeof $fetch

let client: ApiClient | undefined
let clientBaseURL = ''

// $fetch throws a FetchError whose `data` is the JSON body. Better Auth
// failures are a different shape and must not parse as the API error contract.
function parseCaughtApiError(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error) {
    const fromBody = parseApiErrorBody(error.data)
    if (fromBody) {
      return fromBody
    }
  }

  return parseApiErrorBody(error)
}

// Versioned product API client. Better Auth keeps its own unversioned client
// (inside `useAuth`); this is for the `/api/<version>/*` domain routes.
export function useApi() {
  const config = useRuntimeConfig()
  const baseURL = `${config.public.apiBase}/api/${config.public.apiVersion}`

  if (!client || clientBaseURL !== baseURL) {
    client = $fetch.create({
      baseURL,
      credentials: 'include',
    })
    clientBaseURL = baseURL
  }

  return {
    api: client,
    apiUrl: (path: string) => `${baseURL}${path}`,
    parseApiError: parseCaughtApiError,
  }
}
