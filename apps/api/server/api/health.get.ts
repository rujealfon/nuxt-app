import { defineEventHandler } from 'h3'
import { healthResponseSchema } from '../utils/infra'

export default defineEventHandler(() => {
  return healthResponseSchema.parse({
    status: 'ok',
    service: 'api.nuxt-app.com',
    timestamp: new Date().toISOString(),
  })
})
