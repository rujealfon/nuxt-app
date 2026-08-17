import type { AuthUser } from './auth'

export { matchesRequiredRole } from './access'
export { authUserSchema, loginSchema, registerSchema } from './auth'
export type { AuthUser, LoginInput, RegisterInput } from './auth'
export { failedResponseBody, messageFromFailedBody } from './failed-body'

export interface AuthResponse {
  user: AuthUser
  message?: string
}
