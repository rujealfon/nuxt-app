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

// API error contract. Stable across versions: every versioned route answers
// failures with one of these codes and a safe, non-empty message.
// `invalid_input` may include input details; other codes must not.
// Not used by Better Auth or health.
export const apiErrorCodes = [
  'invalid_input',
  'unauthenticated',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'internal_error',
] as const

export type ApiErrorCode = (typeof apiErrorCodes)[number]

export const inputDetailSchema = z.object({
  path: z.array(z.string()),
  message: z.string().min(1),
})

export type InputDetail = z.infer<typeof inputDetailSchema>

export const apiErrorSchema = z.object({
  error: z.enum(apiErrorCodes),
  message: z.string().min(1),
  details: z.array(inputDetailSchema).min(1).optional(),
}).refine(
  body => body.error === 'invalid_input' || body.details === undefined,
)

export type ApiError = z.infer<typeof apiErrorSchema>

export function parseApiError(data: unknown): ApiError | null {
  const parsed = apiErrorSchema.safeParse(data)
  return parsed.success ? parsed.data : null
}

// Actor contract. Derived client- and server-side from the Better Auth
// session: the authenticated identity a request acts as, with the role the UI
// and middleware gate on. An unknown role normalizes to `user`, never up.
export const roles = ['user', 'admin'] as const

export type Role = (typeof roles)[number]

export const roleSchema = z.enum(roles)

export const actorSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().nullable(),
  role: roleSchema.catch('user'),
})

export type Actor = z.infer<typeof actorSchema>

export const actorSessionSchema = z.object({
  user: actorSchema,
})

export function parseActor(user: unknown): Actor | null {
  const parsed = actorSchema.safeParse(user)
  return parsed.success ? parsed.data : null
}

export function actorFromSession(data: unknown): Actor | null {
  const parsed = actorSessionSchema.safeParse(data)
  return parsed.success ? parsed.data.user : null
}

// Versioned API contracts, namespaced by version (`v1.helloResponseSchema`).
export * as v1 from './v1'
