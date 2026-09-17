export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') {
    return
  }

  const client = useAuthClient()
  const { data } = await client.getSession()
  const role = (data?.user as { role?: string } | undefined)?.role

  if (!data?.user || role !== 'admin') {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
