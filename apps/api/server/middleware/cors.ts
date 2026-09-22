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
  // The bearer plugin hands the session token back in `set-auth-token`. Without
  // this the browser hides it from cross-origin JS, and a bearer sign-in stores
  // nothing while reporting success.
  setHeader(event, 'access-control-expose-headers', 'set-auth-token')

  if (getMethod(event) === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
