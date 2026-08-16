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

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  password: string
  name: string
}

export interface AuthResponse {
  user: AuthUser
  message?: string
}

export interface ApiError {
  error: string
  message?: string
}
