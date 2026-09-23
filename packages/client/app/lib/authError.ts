import type { ApiError } from '@nuxt-app/types'
import { invalidInputDetails, parseApiError } from '@nuxt-app/types'

// A server field error, shaped for a form's field names.
export interface AuthFieldError {
  name: string
  message: string
}

// A failed auth call. `apiError` is the API error contract when the server
// answered with it; a transport or network failure leaves it null.
export class AuthRequestError extends Error {
  readonly apiError: ApiError | null

  constructor(message: string, apiError: ApiError | null) {
    super(message)
    this.name = 'AuthRequestError'
    this.apiError = apiError
  }

  // `invalid_input` details reduced to field recovery for the form. A detail
  // with an empty path describes the whole body, which no field can own; the
  // caller keeps its message as the catch-all instead.
  get fieldErrors(): AuthFieldError[] {
    const details = this.apiError ? invalidInputDetails(this.apiError) : []

    return details.flatMap(detail => detail.path.length === 0
      ? []
      : [{ name: detail.path.join('.'), message: detail.message }])
  }
}

// The API error contract from any caught failure. An ofetch `FetchError`
// carries the body on `data`; the Better Auth client spreads the body onto the
// error object itself. Both readers cross this one seam.
export function readApiErrorFrom(error: unknown): ApiError | null {
  if (error && typeof error === 'object' && 'data' in error) {
    const fromBody = parseApiError(error.data)
    if (fromBody) {
      return fromBody
    }
  }

  return parseApiError(error)
}

function messageOf(error: unknown): string | undefined {
  if (
    error
    && typeof error === 'object'
    && 'message' in error
    && typeof error.message === 'string'
    && error.message.length > 0
  ) {
    return error.message
  }

  return undefined
}

// The Better Auth client resolves failures as `{ error }` with the response
// body spread in. `/api/auth/*` normalizes every failure to the API error
// contract, so read it first and fall back to the thrown message otherwise.
export function authRequestError(error: unknown): AuthRequestError {
  const apiError = readApiErrorFrom(error)

  return apiError
    ? new AuthRequestError(apiError.message, apiError)
    : new AuthRequestError(messageOf(error) ?? 'Unable to continue', null)
}
