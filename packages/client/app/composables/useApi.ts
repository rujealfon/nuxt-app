import type { FetchContext } from 'ofetch'
import { isBearerTransport } from '@nuxt-app/config'
import { parseApiError } from '@nuxt-app/types'
import { $fetch, createUseFetch, useRequestHeaders, useRuntimeConfig } from '#imports'
import { apiClientKey, apiFetchOptions } from '../lib/authTransport'

type ApiClient = typeof $fetch

// Client per `baseURL` + transport. Keying instead of tracking parallel globals
// means adding a config dimension cannot silently reuse a stale client.
const clients = new Map<string, ApiClient>()

function clientFor(baseURL: string, bearer: boolean): ApiClient {
  const key = apiClientKey(baseURL, bearer)
  let cached = clients.get(key)

  if (!cached) {
    cached = $fetch.create({
      baseURL,
      ...apiFetchOptions(baseURL, bearer),
    })
    clients.set(key, cached)
  }

  return cached
}

// $fetch throws a FetchError whose `data` is the JSON body. `useAuth` reads the
// auth client's failures through `authRequestError`; both are the API error
// contract, so this reads only the versioned-route body.
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
  // Never cache request credentials at module scope. Forward only cookies,
  // and only to the configured API origin, including when callers pass a URL.
  const cookie = import.meta.server && !bearer ? useRequestHeaders(['cookie']).cookie : undefined
  const api = import.meta.server
    ? $fetch.create({
        baseURL,
        ...apiFetchOptions(baseURL, bearer),
        ...(cookie && {
          onRequest({ request, options }: FetchContext) {
            const target = new URL(typeof request === 'string' ? request : request.url, options.baseURL || baseURL)
            if (target.origin === new URL(baseURL).origin) {
              options.headers.set('cookie', cookie)
            }
          },
        }),
      })
    : clientFor(baseURL, bearer)

  return {
    api,
    parseApiError: apiErrorFromCaught,
  }
}

// SSR-aware versioned-route fetcher. It uses the same configured client as
// `useApi()`, so cookie and bearer transports cannot diverge.
export const useApiFetch = createUseFetch(callerOptions => ({
  ...callerOptions,
  $fetch: useApi().api,
}))
