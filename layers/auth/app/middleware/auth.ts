import { applyRouteAccess } from '../utils/routeAccess'

export default defineNuxtRouteMiddleware(async (to) => {
  const decision = await applyRouteAccess('auth', to)
  if ('redirect' in decision)
    return navigateTo(decision.redirect)
})
