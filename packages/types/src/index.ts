import type { AuthUser } from './auth'

export { authUserSchema, loginSchema, registerSchema } from './auth'
export type { AuthUser, LoginInput, RegisterInput } from './auth'

export interface AuthResponse {
  user: AuthUser
  message?: string
}

export interface ApiError {
  message: string
}

export interface ApiValidationError {
  success: false
  error: {
    name: string
    issues: Array<{
      code: string
      path: Array<string | number>
      message?: string
    }>
  }
}
