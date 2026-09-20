import { defineNuxtRouteMiddleware, navigateTo, useAuth } from '#imports'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') {
    return
  }

  const { getActor } = useAuth()
  const actor = await getActor()

  if (actor?.role !== 'admin') {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
