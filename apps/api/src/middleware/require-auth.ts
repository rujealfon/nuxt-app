import { factory } from '@api/factory.js'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import * as HttpStatusPhrases from 'stoker/http-status-phrases'

export const requireAuth = factory.createMiddleware(async (c, next) => {
  const user = c.get('user')
  if (!user)
    return c.json({ message: HttpStatusPhrases.UNAUTHORIZED }, HttpStatusCodes.UNAUTHORIZED)
  await next()
})
