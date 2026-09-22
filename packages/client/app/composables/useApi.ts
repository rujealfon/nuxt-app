import { isBearerTransport } from '@nuxt-app/config'
import { parseApiError } from '@nuxt-app/types'
import { $fetch, useRuntimeConfig } from '#imports'
import { apiFetchOptions } from '../lib/authTransport'

type ApiClient = typeof $fetch

// Client per `baseURL` + transport. Keying instead of tracking parallel globals
// means adding a config dimension cannot silently reuse a stale client.
const clients = new Map<string, ApiClient>()

function clientFor(baseURL: string, bearer: boolean): ApiClient {
  const key = `${baseURL}|${bearer ? 'bearer' : 'cookie'}`
  let cached = clients.get(key)

  if (!cached) {
    cached = $fetch.create({
      baseURL,
      ...apiFetchOptions(bearer),
    })
    clients.set(key, cached)
  }

  return cached
}

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
  const bearer = isBearerTransport(config.public.sessionTransport)

  return {
    api: clientFor(baseURL, bearer),
    // Cookie transport only: `useFetch` builds its own request and never runs
    // this client's `onRequest`, so bearer mode would send it unauthenticated.
    // Use `api` for bearer calls.
    apiUrl: (path: string) => `${baseURL}${path}`,
    parseApiError: apiErrorFromCaught,
  }
}
