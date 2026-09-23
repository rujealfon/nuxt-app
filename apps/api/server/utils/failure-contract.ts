import type { ApiErrorCode } from '@nuxt-app/types'

// The one status table for the API error contract. The error adapter renders
// with it; the auth mapping asks it how to conceal a Better Auth status. A new
// code is added here once.
export const statusByError: Record<ApiErrorCode, number> = {
  invalid_input: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  internal_error: 500,
}

const errorByStatus = Object.fromEntries(
  Object.entries(statusByError).map(([error, status]) => [status, error] as const),
) as Partial<Record<number, ApiErrorCode>>

// Framework 4xx stay client errors. An unmapped 4xx (including 422) conceals
// as `not_found`, not field validation. 5xx and non-HTTP statuses return
// undefined so the caller can choose between `internal_error` and an
// unhandled-error log.
export function errorFromStatus(status: number): ApiErrorCode | undefined {
  const mapped = errorByStatus[status]

  if (mapped) {
    return mapped
  }

  return status >= 400 && status < 500 ? 'not_found' : undefined
}

// A status that arrived on the wire is always rendered: a dedicated status or
// an unmapped 4xx maps through `errorFromStatus`, and a 5xx conceals as
// `internal_error`.
export function concealedErrorFromStatus(status: number): ApiErrorCode {
  return errorFromStatus(status) ?? 'internal_error'
}
