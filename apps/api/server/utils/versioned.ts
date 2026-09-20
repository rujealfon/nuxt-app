import type { ApiVersion } from '@nuxt-app/config'
import { versionMeta } from '@nuxt-app/config'
import { defineEventHandler, setHeader } from 'h3'
import { deprecationHeaders } from './deprecation'

type VersionedHandler = Parameters<typeof defineEventHandler>[0]

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
