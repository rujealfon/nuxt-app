export default defineEventHandler(() => {
  return {
    status: 'ok',
    service: 'api.nuxt-app.com',
    timestamp: new Date().toISOString(),
  }
})
