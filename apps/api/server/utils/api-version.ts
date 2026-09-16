import type { ApiVersion } from '@nuxt-app/config'
import { apiVersions, currentApiVersion, deprecatedApiVersions } from '@nuxt-app/config'

export { apiVersions, currentApiVersion }
export type { ApiVersion }

export interface VersionMeta {
  version: ApiVersion
  deprecated: boolean
  sunset?: string
}

export function isApiVersion(value: string): value is ApiVersion {
  return (apiVersions as readonly string[]).includes(value)
}

export function versionMeta(version: ApiVersion): VersionMeta {
  const meta = deprecatedApiVersions[version]

  return {
    version,
    deprecated: Boolean(meta),
    ...(meta ? { sunset: meta.sunset } : {}),
  }
}
