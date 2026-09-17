import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginCredentials = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type RegisterCredentials = z.infer<typeof registerSchema>

// Product error contract. Stable across API versions: every product route
// answers failures with one of these codes and a safe message.
export const productErrorCodes = [
  'invalid_input',
  'unauthenticated',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'internal_error',
] as const

export type ProductErrorCode = (typeof productErrorCodes)[number]

export const productErrorSchema = z.object({
  error: z.enum(productErrorCodes),
  message: z.string(),
})

export type ProductError = z.infer<typeof productErrorSchema>

// Actor contract. Derived client- and server-side from the Better Auth
// session: the authenticated identity a request acts as, with the role the UI
// and middleware gate on. An unknown role normalizes to `user`, never up.
export const roles = ['user', 'admin'] as const

export type Role = (typeof roles)[number]

export const roleSchema = z.enum(roles)

export const actorSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().nullable().optional(),
  role: roleSchema.catch('user'),
})

export type Actor = z.infer<typeof actorSchema>

// Versioned API contracts, namespaced by version (`v1.helloResponseSchema`).
export * as v1 from './v1'
