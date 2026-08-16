import { factory } from '../factory.js'

export const requireAuth = factory.createMiddleware(async (c, next) => {
  const user = c.get('user')
  if (!user)
    return c.json({ error: 'Unauthorized' }, 401)
  await next()
})
