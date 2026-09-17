// Sites with a browser surface share this port table with the API. Localhost
// URLs derive from it; each app adds its own `appName` in its Nuxt config.
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

// Localhost-defaulted cross-site URLs for `runtimeConfig.public`. Each app
// spreads these and adds its own `appName`; `NUXT_PUBLIC_*` env vars override
// individual URLs at runtime through Nuxt's own mapping.
export const siteUrls = {
  webUrl: `http://localhost:${appPorts.web}`,
  appUrl: `http://localhost:${appPorts.app}`,
  adminUrl: `http://localhost:${appPorts.admin}`,
} as const

// Product API versions. Domain endpoints live under `/api/<version>/`; infra
// routes (auth, health) are deliberately unversioned. To ship a new version:
// append it here, bump `currentApiVersion`, add a `v<next>` contracts namespace
// to `@nuxt-app/types`, and mark the old one in `deprecatedApiVersions` with a
// `sunset` date.
export const apiVersions = ['v1'] as const

export type ApiVersion = (typeof apiVersions)[number]

export const currentApiVersion: ApiVersion = 'v1'

export type DeprecatedApiVersions = Readonly<Partial<Record<ApiVersion, { sunset: string }>>>

// Frozen: the registry is static configuration declared in code, so no
// consumer — or spec — may mutate it at runtime.
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
