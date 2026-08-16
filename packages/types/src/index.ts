export interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  createdAt: string
  updatedAt: string
}

export interface Session {
  id: string
  userId: string
  expiresAt: string
  createdAt: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
}

export { loginSchema, registerSchema } from './auth'
export type { LoginInput, RegisterInput } from './auth'

export interface AuthResponse {
  user: AuthUser
  message?: string
}

export interface ApiError {
  error: string
  message?: string
}
