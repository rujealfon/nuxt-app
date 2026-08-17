import type { AuthUser } from './auth'

export function matchesRequiredRole(
  user: AuthUser,
  requireRole?: AuthUser['role'],
): boolean {
  if (!requireRole)
    return true
  return user.role === requireRole
}
