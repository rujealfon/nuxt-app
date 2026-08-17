export default defineNuxtRouteMiddleware(async () => {
  const { user, ensureUser } = useAuth()
  await ensureUser()

  if (user.value?.role === 'admin')
    return navigateTo('/')
})
