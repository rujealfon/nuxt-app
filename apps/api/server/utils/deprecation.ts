import type { VersionMeta } from '@nuxt-app/config'

// Derives the `Deprecation` + `Sunset` header pair from version metadata, or
// nothing for a live version. Pure, so OpenAPI and handlers share one policy
// without importing h3.
export function deprecationHeaders(meta: VersionMeta): [string, string][] {
  if (!meta.deprecated || !meta.sunset) {
    return []
  }

  return [['deprecation', 'true'], ['sunset', new Date(meta.sunset).toUTCString()]]
}
