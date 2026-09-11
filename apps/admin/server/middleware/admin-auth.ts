import { timingSafeEqual } from 'node:crypto'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const expectedPassword = config.adminPassword

  if (!expectedPassword) {
    // Fail closed in production; allow local dev without a configured password.
    if (import.meta.dev) {
      return
    }

    throw createError({
      statusCode: 503,
      statusMessage: 'Admin authentication is not configured',
    })
  }

  const header = getHeader(event, 'authorization') || ''
  const [scheme, encoded] = header.split(' ')

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
    const separator = decoded.indexOf(':')
    const user = decoded.slice(0, separator)
    const password = decoded.slice(separator + 1)

    if (safeEqual(user, config.adminUser) && safeEqual(password, expectedPassword)) {
      return
    }
  }

  setHeader(event, 'www-authenticate', 'Basic realm="admin"')
  throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
})

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB)
}
