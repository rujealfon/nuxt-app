export default defineNuxtRouteMiddleware(async (to) => {
  const { user, loading, fetchUser } = useAuth()

  if (loading.value) {
    await fetchUser()
  }

  if (!user.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }
})
