export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const origin = getHeader(event, 'origin') || ''

  const configured = (config.corsOrigins || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

  const defaults = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ]

  const allowed = configured.length ? configured : defaults

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

  if (getMethod(event) === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
