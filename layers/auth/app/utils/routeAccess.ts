import type { AuthUser } from '@nuxt-app/types'
import { matchesRequiredRole } from '@nuxt-app/types'

export type RouteGate = 'auth' | 'guest' | 'guest-admin' | 'admin'

export type RouteDecision
  = | { allow: true }
    | { redirect: string | { path: string, query: Record<string, string> } }

export function resolveRouteAccess(
  user: AuthUser | null,
  gate: RouteGate,
  to: { fullPath: string },
): RouteDecision {
  switch (gate) {
    case 'auth':
      if (!user)
        return { redirect: { path: '/login', query: { redirect: to.fullPath } } }
      return { allow: true }
    case 'guest':
      if (user)
        return { redirect: '/' }
      return { allow: true }
    case 'guest-admin':
      if (user?.role === 'admin')
        return { redirect: '/' }
      return { allow: true }
    case 'admin':
      if (!user)
        return { redirect: { path: '/login', query: { redirect: to.fullPath } } }
      if (!matchesRequiredRole(user, 'admin'))
        return { redirect: '/login' }
      return { allow: true }
  }
}

/** Guards always refetch Session so a revoked cookie cannot pass on stale cache. */
export async function applyRouteAccess(gate: RouteGate, to: { fullPath: string }) {
  const { fetchUser } = useAuth()
  const user = await fetchUser()
  return resolveRouteAccess(user, gate, to)
}
