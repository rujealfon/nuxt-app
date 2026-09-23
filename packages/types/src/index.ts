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

export const apiErrorMessages: Record<ApiErrorCode, string> = {
  invalid_input: 'The request was invalid',
  unauthenticated: 'Sign in is required',
  forbidden: 'You do not have access to this resource',
  not_found: 'The requested resource was not found',
  conflict: 'The request conflicts with the current state',
  rate_limited: 'Too many requests',
  internal_error: 'An unexpected error occurred',
}

// A union rather than a refined object so the "details only on invalid_input"
// rule is expressible as JSON Schema for the OpenAPI document instead of being
// a runtime-only refinement.
export const apiErrorSchema = z.union([
  z.object({
    error: z.literal('invalid_input'),
    message: z.string().min(1),
    details: z.array(inputDetailSchema).min(1).optional(),
  }),
  z.object({
    error: z.enum(apiErrorCodes).exclude(['invalid_input']),
    message: z.string().min(1),
    // Declared so a body carrying `details` on a non-`invalid_input` code is
    // rejected, and so the OpenAPI schema forbids it too.
    details: z.never().optional(),
  }),
])

export type ApiError = z.infer<typeof apiErrorSchema>

function usableInputDetails(
  error: ApiErrorCode,
  details: readonly InputDetail[] | undefined,
): InputDetail[] | undefined {
  if (error !== 'invalid_input' || !details?.length) {
    return undefined
  }

  const usable = details.flatMap((detail) => {
    const parsed = inputDetailSchema.safeParse(detail)
    return parsed.success ? [parsed.data] : []
  })

  return usable.length > 0 ? usable : undefined
}

// The write path for the API error contract. `safeParse`s so a drifted
// constructor cannot emit a body the schema would reject; an unusable default
// message falls through to canned `internal_error`.
export function apiError(
  error: ApiErrorCode,
  message?: string,
  details?: readonly InputDetail[],
): ApiError {
  const usable = usableInputDetails(error, details)
  const candidate = {
    error,
    message: message?.length ? message : apiErrorMessages[error],
    ...(usable ? { details: usable } : {}),
  }
  const parsed = apiErrorSchema.safeParse(candidate)

  if (parsed.success) {
    return parsed.data
  }

  return {
    error: 'internal_error',
    message: apiErrorMessages.internal_error,
  }
}

export function parseApiError(data: unknown): ApiError | null {
  const parsed = apiErrorSchema.safeParse(data)
  return parsed.success ? parsed.data : null
}

// The input details a client may act on. The schema already forbids details on
// any other code, so this only narrows the union for readers.
export function invalidInputDetails(error: ApiError): readonly InputDetail[] {
  return error.error === 'invalid_input' ? error.details ?? [] : []
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

export function actorFromSession(data: unknown): Actor | null {
  const parsed = actorSessionSchema.safeParse(data)
  return parsed.success ? parsed.data.user : null
}

// Versioned API contracts, namespaced by version (`v1.helloResponseSchema`).
export * as v1 from './v1'
export type { VersionedOperation } from './v1'
