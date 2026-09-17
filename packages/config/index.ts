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
// append it here, bump `currentApiVersion`, and mark the old one in
// `deprecatedApiVersions` with a `sunset` date.
export const apiVersions = ['v1'] as const

export type ApiVersion = (typeof apiVersions)[number]

export const currentApiVersion: ApiVersion = 'v1'

export const deprecatedApiVersions: Partial<Record<ApiVersion, { sunset: string }>> = {}
