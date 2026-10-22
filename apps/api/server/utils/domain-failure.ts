import type { ApiErrorCode, InputDetail } from '@nuxt-app/types'
import type { ZodError } from 'zod'
import { apiErrorMessages, inputDetailSchema } from '@nuxt-app/types'

export const domainFailureMessages = apiErrorMessages

// An expected domain failure as plain data, independent of how it reaches the
// client. Service code returns it inside `err(...)`; the HTTP edge turns it
// into a `DomainFailure` with `unwrapOrThrow`, and the error adapter maps
// `error` to an HTTP status and the API error contract. Domain code never
// picks a status. `message` is always the safe, non-empty text for the client.
export interface Failure {
  readonly error: ApiErrorCode
  readonly message: string
  readonly details?: readonly InputDetail[] | undefined
}

// Runtime check for the `Failure` shape: the type system keeps `err('x')` out of a
// route handler, but a cast or an untyped caller can still reach the HTTP edge with
// any payload, so `unwrapOrThrow` checks before it trusts the value.
export function isFailure(value: unknown): value is Failure {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const { error, message } = value as Record<string, unknown>

  return typeof error === 'string'
    && Object.hasOwn(apiErrorMessages, error)
    && typeof message === 'string'
    && message.length > 0
}

// An empty override is treated as absent so the API error contract's
// non-empty message invariant holds by construction. Input details exist for
// `invalid_input` only.
export function failure(
  error: ApiErrorCode,
  message?: string,
  details?: readonly InputDetail[],
): Failure {
  return {
    error,
    message: message?.length ? message : domainFailureMessages[error],
    details: error === 'invalid_input' ? details : undefined,
  }
}

// The thrown form of a failure, for code that must raise at the h3 boundary
// (middleware, session guards, the result edge). Domain services return a
// `Failure` in a `Result` instead of throwing this.
export class DomainFailure extends Error {
  readonly error: ApiErrorCode
  readonly details: readonly InputDetail[] | undefined

  constructor(error: ApiErrorCode, message?: string, details?: readonly InputDetail[]) {
    const value = failure(error, message, details)

    super(value.message)
    this.name = 'DomainFailure'
    this.error = value.error
    this.details = value.details
  }
}

export function domainFailure(
  error: ApiErrorCode,
  message?: string,
  details?: readonly InputDetail[],
): DomainFailure {
  return new DomainFailure(error, message, details)
}

export function domainFailureFrom(value: Failure): DomainFailure {
  return new DomainFailure(value.error, value.message, value.details)
}

// Request-boundary conversion: a ZodError never reaches the error adapter.
// Handlers and services turn parsed issues into a failure with input details.
export function invalidInputFromZod(zodError: ZodError, message?: string): Failure {
  const details = zodError.issues.flatMap((issue) => {
    const detail = {
      path: issue.path.map(String),
      message: issue.message,
    }
    return inputDetailSchema.safeParse(detail).success ? [detail] : []
  })

  return failure('invalid_input', message, details.length > 0 ? details : undefined)
}
