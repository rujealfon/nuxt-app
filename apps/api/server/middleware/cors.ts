import { parseOrigins } from '@nuxt-app/config'
import { defineEventHandler, getHeader, setHeader, setResponseStatus } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { canExposeBearerToken } from '../utils/bearer-origin'

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
  if (canExposeBearerToken(origin, config)) {
    setHeader(event, 'access-control-expose-headers', 'set-auth-token')
  }

  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
