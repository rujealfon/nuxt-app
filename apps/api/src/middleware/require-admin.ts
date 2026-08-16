import { factory } from '@api/factory.js'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import * as HttpStatusPhrases from 'stoker/http-status-phrases'

export const requireAdmin = factory.createMiddleware(async (c, next) => {
  const user = c.get('user')
  if (!user)
    return c.json({ message: HttpStatusPhrases.UNAUTHORIZED }, HttpStatusCodes.UNAUTHORIZED)
  if (user.role !== 'admin')
    return c.json({ message: HttpStatusPhrases.FORBIDDEN }, HttpStatusCodes.FORBIDDEN)
  await next()
})
