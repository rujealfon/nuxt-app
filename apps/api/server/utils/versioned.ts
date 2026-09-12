import type { ApiVersion } from '@mysite/config'
import { deprecatedApiVersions } from '@mysite/config'

type VersionedHandler = Parameters<typeof defineEventHandler>[0]

// Wraps a route handler so every versioned response advertises its version and,
// once deprecated, a `Deprecation` + `Sunset` pair for clients to react to.
export function defineVersionedHandler(version: ApiVersion, handler: VersionedHandler) {
  return defineEventHandler((event) => {
    setHeader(event, 'x-api-version', version)

    const deprecation = deprecatedApiVersions[version]
    if (deprecation) {
      setHeader(event, 'deprecation', 'true')
      setHeader(event, 'sunset', new Date(deprecation.sunset).toUTCString())
    }

    return handler(event)
  })
}
