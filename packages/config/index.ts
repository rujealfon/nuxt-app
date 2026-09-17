// Sites with a browser surface. Ports and cross-site URLs derive from this
// registry; each app adds its own `appName` in its Nuxt config. The `SiteKey`
// union also lives in `packages/ui` (`useSite`) until the workspace supports
// sharing it without a new package edge.
export const sites = {
  web: { port: 3000 },
  app: { port: 3001 },
  admin: { port: 3002 },
} as const

export type SiteKey = keyof typeof sites

export const appPorts = {
  web: sites.web.port,
  app: sites.app.port,
  admin: sites.admin.port,
  api: 3003,
} as const

export function apiBaseFor(env: string | undefined): string {
  return env || `http://localhost:${appPorts.api}`
}

// Localhost-defaulted cross-site URLs for `runtimeConfig.public`. Each app
// spreads these and adds its own `appName`; `NUXT_PUBLIC_*` env vars override
// individual URLs at runtime through Nuxt's own mapping.
export function siteUrls() {
  return {
    webUrl: `http://localhost:${sites.web.port}`,
    appUrl: `http://localhost:${sites.app.port}`,
    adminUrl: `http://localhost:${sites.admin.port}`,
  }
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
