import type { ApiVersion, VersionMeta } from '@nuxt-app/config'
import { versionMeta } from '@nuxt-app/config'

type VersionedHandler = Parameters<typeof defineEventHandler>[0]

// Derives the `Deprecation` + `Sunset` header pair from version metadata, or
// nothing for a live version. Pure, so specs never touch shared state.
export function deprecationHeaders(meta: VersionMeta): [string, string][] {
  if (!meta.deprecated || !meta.sunset) {
    return []
  }

  return [['deprecation', 'true'], ['sunset', new Date(meta.sunset).toUTCString()]]
}

// Wraps a route handler so every versioned response advertises its version and,
// once deprecated, a `Deprecation` + `Sunset` pair for clients to react to.
export function defineVersionedHandler(version: ApiVersion, handler: VersionedHandler) {
  return defineEventHandler((event) => {
    setHeader(event, 'x-api-version', version)

    deprecationHeaders(versionMeta(version)).forEach(([name, value]) => {
      setHeader(event, name, value)
    })

    return handler(event)
  })
}
