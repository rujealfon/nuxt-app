import { factory } from '@api/factory.js'
import { currentUser } from '@api/modules/auth/session.js'

export const sessionMiddleware = factory.createMiddleware(async (c, next) => {
  c.set('user', await currentUser(c))
  await next()
})
