export async function getCurrentUser(event: Parameters<typeof getCookie>[0]) {
  const session = await useAuth().api.getSession({ headers: event.headers })
  return session?.user ?? null
}

export async function requireUser(event: Parameters<typeof getCookie>[0]) {
  const user = await getCurrentUser(event)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  return user
}
