export default defineNuxtRouteMiddleware(async (to) => {
  const { user, ensureUser } = useAuth()
  await ensureUser()

  if (!user.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }

  if (user.value.role !== 'admin')
    return navigateTo('/login')
})
