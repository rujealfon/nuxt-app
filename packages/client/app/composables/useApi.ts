import { parseApiError } from '@nuxt-app/types'

type ApiClient = typeof $fetch

let client: ApiClient | undefined
let clientBaseURL = ''

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
    parseApiError: apiErrorFromCaught,
  }
}
