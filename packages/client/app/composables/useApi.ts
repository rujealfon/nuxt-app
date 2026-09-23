import type { FetchContext } from 'ofetch'
import type { SessionTransport } from '../lib/sessionTransport'
import { isBearerTransport } from '@nuxt-app/config'
import { $fetch, createUseFetch, useRequestHeaders, useRuntimeConfig } from '#imports'
import { readApiErrorFrom } from '../lib/authError'
import { createSessionTransport } from '../lib/sessionTransport'

type ApiClient = typeof $fetch

// Client per `baseURL` + transport. Keying instead of tracking parallel globals
// means adding a config dimension cannot silently reuse a stale client.
const clients = new Map<string, ApiClient>()

function clientFor(baseURL: string, transport: SessionTransport): ApiClient {
  let cached = clients.get(transport.clientKey)

  if (!cached) {
    cached = $fetch.create({
      baseURL,
      ...transport.apiClientOptions,
    })
    clients.set(transport.clientKey, cached)
  }

  return cached
}

// Versioned-route client. Better Auth keeps its own unversioned client
// (inside `useAuth`); this is for `/api/<version>/*`.
export function useApi() {
  const config = useRuntimeConfig()
  const baseURL = `${config.public.apiBase}/api/${config.public.apiVersion}`
  const bearer = isBearerTransport(config.public.sessionTransport)
  const transport = createSessionTransport(baseURL, bearer)
  // Never cache request credentials at module scope. Forward only cookies,
  // and only to the configured API origin, including when callers pass a URL.
  const cookie = import.meta.server && !bearer ? useRequestHeaders(['cookie']).cookie : undefined
  const api = import.meta.server
    ? $fetch.create({
        baseURL,
        ...transport.apiClientOptions,
        ...(cookie && {
          onRequest({ request, options }: FetchContext) {
            if (transport.isConfiguredOrigin(request, options.baseURL)) {
              options.headers.set('cookie', cookie)
            }
          },
        }),
      })
    : clientFor(baseURL, transport)

  return {
    api,
    parseApiError: readApiErrorFrom,
  }
}

// SSR-aware versioned-route fetcher. It uses the same configured client as
// `useApi()`, so cookie and bearer transports cannot diverge.
export const useApiFetch = createUseFetch(callerOptions => ({
  ...callerOptions,
  $fetch: useApi().api,
}))
