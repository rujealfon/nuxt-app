import { factory } from '../../factory.js'
import { requireAdmin } from '../../middleware/require-admin.js'

export const adminRoutes = factory.createApp()
  .use('*', requireAdmin)
  .get('/dashboard', (c) => {
    return c.json({
      message: 'Welcome to admin dashboard',
      user: c.get('user'),
    })
  })
