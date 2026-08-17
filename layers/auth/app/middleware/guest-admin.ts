import { resolveRouteAccess } from '../utils/routeAccess'

export default defineNuxtRouteMiddleware(async (to) => {
  const { user, ensureUser } = useAuth()
  await ensureUser()

  const decision = resolveRouteAccess(user.value, 'guest-admin', to)
  if ('redirect' in decision)
    return navigateTo(decision.redirect)
})
