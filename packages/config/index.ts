export const appPorts = {
  web: 3000,
  app: 3001,
  admin: 3002,
  api: 3003,
} as const

export function apiBaseFor(env: string | undefined): string {
  return env || `http://localhost:${appPorts.api}`
}

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
