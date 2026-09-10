export default defineEventHandler(() => {
  return {
    status: 'ok',
    service: 'api.mysite.com',
    timestamp: new Date().toISOString(),
  }
})
