import { factory } from '@api/factory.js'
import { failedResponseBody, matchesRequiredRole } from '@nuxt-app/types'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import * as HttpStatusPhrases from 'stoker/http-status-phrases'

export const requireAdmin = factory.createMiddleware(async (c, next) => {
  const user = c.get('user')
  if (!user)
    return c.json(failedResponseBody(HttpStatusPhrases.UNAUTHORIZED), HttpStatusCodes.UNAUTHORIZED)
  if (!matchesRequiredRole(user, 'admin'))
    return c.json(failedResponseBody(HttpStatusPhrases.FORBIDDEN), HttpStatusCodes.FORBIDDEN)
  await next()
})
