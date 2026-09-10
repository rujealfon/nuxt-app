export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  return user
})
