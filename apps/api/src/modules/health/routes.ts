import { factory } from '@api/factory.js'

export const healthRoutes = factory.createApp()
  .get('/', c => c.json({ status: 'ok', service: 'nuxt-app-api' }))
  .get('/health', c => c.json({ status: 'ok' }))
