import { parseOrigins } from '@nuxt-app/config'
import { defineEventHandler, getHeader, getMethod, setHeader, setResponseStatus } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const origin = getHeader(event, 'origin') || ''

  const allowed = parseOrigins(config.corsOrigins || '')

  if (origin && allowed.includes(origin)) {
    setHeader(event, 'access-control-allow-origin', origin)
    setHeader(event, 'access-control-allow-credentials', 'true')
    setHeader(event, 'vary', 'Origin')
  }
  else if (allowed.includes('*')) {
    // Wildcard can't be combined with credentials; browsers reject it.
    setHeader(event, 'access-control-allow-origin', '*')
  }

  setHeader(event, 'access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  setHeader(event, 'access-control-allow-headers', 'content-type, authorization')
  // Only a bearer-enabled deployment issues `set-auth-token`. Advertising it
  // everywhere would invite cookie clients to read a token they should never
  // see; see ADR-0003.
  if (config.authBearerEnabled) {
    setHeader(event, 'access-control-expose-headers', 'set-auth-token')
  }

  if (getMethod(event) === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
