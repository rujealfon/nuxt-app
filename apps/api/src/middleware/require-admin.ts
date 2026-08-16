import { factory } from '@api/factory.js'

export const requireAdmin = factory.createMiddleware(async (c, next) => {
  const user = c.get('user')
  if (!user)
    return c.json({ error: 'Unauthorized' }, 401)
  if (user.role !== 'admin')
    return c.json({ error: 'Forbidden – admin only' }, 403)
  await next()
})
