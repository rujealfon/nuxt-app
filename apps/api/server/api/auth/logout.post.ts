export default defineEventHandler((event) => {
  clearSessionToken(event)
  return { ok: true }
})
