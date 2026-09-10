export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const expectedPassword = config.adminPassword

  if (!expectedPassword) {
    return
  }

  const header = getHeader(event, 'authorization') || ''
  const [scheme, encoded] = header.split(' ')

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
    const separator = decoded.indexOf(':')
    const user = decoded.slice(0, separator)
    const password = decoded.slice(separator + 1)

    if (user === config.adminUser && password === expectedPassword) {
      return
    }
  }

  setHeader(event, 'www-authenticate', 'Basic realm="admin"')
  throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
})
