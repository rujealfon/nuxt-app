import type { VersionedOperation } from '@nuxt-app/types'
import { v1 } from '@nuxt-app/types'

// Browser-facing sites share this port table with the API. Localhost URLs
// derive from it; each app adds its own `appName` in its Nuxt config.
export const appPorts = {
  web: 3000,
  app: 3001,
  admin: 3002,
  api: 3003,
} as const

export type SiteKey = 'web' | 'app' | 'admin'

export function apiBaseFor(env: string | undefined): string {
  return env || `http://localhost:${appPorts.api}`
}

// How a client carries its session to the API. `cookie` is the default browser
// transport; `bearer` carries the opaque session token in an `Authorization`
// header, which is the only transport that survives a cross-origin WebView
// (a Capacitor app, whose origin the API sees as `https://localhost`).
// Anything unrecognized falls back to cookies, the conservative choice.
export type SessionTransport = 'cookie' | 'bearer'

export const defaultSessionTransport: SessionTransport = 'cookie'

export function sessionTransportFor(env: string | undefined): SessionTransport {
  return env === 'bearer' ? 'bearer' : defaultSessionTransport
}

// The one place that knows which transport string means bearer, so the client
// layer never repeats the literal.
export function isBearerTransport(transport: string | undefined): boolean {
  return transport === 'bearer'
}

// Better Auth hands a freshly issued session token back in this header. The
// client stores it; the API exposes it only to configured native origins.
export const sessionTokenHeader = 'set-auth-token'

// The session endpoint whose 401 means the stored bearer token is dead. The
// client clears its copy; the API strips the token from this response's JSON.
export const sessionEndpoint = '/get-session'

// The Better Auth mount. Infra routes are unversioned, so the API, its rate
// limit exemption, and the token-stripping path set all derive from it.
export const authMount = '/api/auth'

// Localhost-defaulted cross-site URLs for `runtimeConfig.public`. Each app
// spreads these and adds its own `appName`; `NUXT_PUBLIC_*` env vars override
// individual URLs at runtime through Nuxt's own mapping.
export const siteUrls = {
  webUrl: `http://localhost:${appPorts.web}`,
  appUrl: `http://localhost:${appPorts.app}`,
  adminUrl: `http://localhost:${appPorts.admin}`,
} as const

// CORS and Better Auth share this list. An empty `CORS_ORIGINS` value means
// the local site table, not "trust nothing" on one side and localhost on the
// other.
export function parseOrigins(corsOrigins: string): string[] {
  const configured = corsOrigins
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)

  return configured.length > 0 ? configured : Object.values(siteUrls)
}

// Versioned-route versions. Versioned routes live under `/api/<version>/`;
// infra routes (auth, health, docs, version registry) are unversioned. To
// ship a new version:
// append it here, bump `currentApiVersion`, add a `v<next>` contracts namespace
// to `@nuxt-app/types`, and mark the old one in `deprecatedApiVersions` with a
// `sunset` date.
export const apiVersions = ['v1'] as const

export type ApiVersion = (typeof apiVersions)[number]

export const currentApiVersion: ApiVersion = 'v1'

export type DeprecatedApiVersions = Readonly<Partial<Record<ApiVersion, { sunset: string }>>>

// Frozen: the registry is static configuration declared in code, so no
// consumer, or spec, may mutate it at runtime.
export const deprecatedApiVersions: DeprecatedApiVersions = Object.freeze({})

export interface VersionMeta {
  version: ApiVersion
  deprecated: boolean
  sunset?: string
}

// Derives version metadata from the registry. Takes an explicit registry so
// tests never mutate the shared one.
export function versionMeta(version: ApiVersion, deprecated: DeprecatedApiVersions = deprecatedApiVersions): VersionMeta {
  const meta = deprecated[version]

  return {
    version,
    deprecated: Boolean(meta),
    ...(meta ? { sunset: meta.sunset } : {}),
  }
}

// One entry per registered version, so the OpenAPI builder, the parity check,
// and the route wrapper read one table. `Record<ApiVersion, ...>` makes a
// version without registered operations a type error.
export const versionedOperations: Record<ApiVersion, readonly VersionedOperation[]> = {
  v1: v1.operations,
}
