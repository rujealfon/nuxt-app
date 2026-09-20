import type { ApiErrorCode, InputDetail } from '@nuxt-app/types'
import type { ZodError } from 'zod'
import { apiErrorMessages, inputDetailSchema } from '@nuxt-app/types'

export const domainFailureMessages = apiErrorMessages

// A failure raised by domain code, independent of how it reaches the client.
// The error adapter maps `error` to an HTTP status and the API error
// contract; domain code never picks a status.
export class DomainFailure extends Error {
  readonly error: ApiErrorCode
  readonly details: readonly InputDetail[] | undefined

  constructor(error: ApiErrorCode, message?: string, details?: readonly InputDetail[]) {
    // An empty override is treated as absent so the API error contract's
    // non-empty message invariant holds by construction.
    super(message?.length ? message : domainFailureMessages[error])
    this.name = 'DomainFailure'
    this.error = error
    this.details = error === 'invalid_input' ? details : undefined
  }
}

export function domainFailure(
  error: ApiErrorCode,
  message?: string,
  details?: readonly InputDetail[],
): DomainFailure {
  return new DomainFailure(error, message, details)
}

// Request-boundary conversion: a ZodError never reaches the error adapter.
// Handlers turn parsed issues into a domain failure with input details.
export function invalidInputFromZod(zodError: ZodError, message?: string): DomainFailure {
  const details = zodError.issues.flatMap((issue) => {
    const detail = {
      path: issue.path.map(String),
      message: issue.message,
    }
    return inputDetailSchema.safeParse(detail).success ? [detail] : []
  })

  return domainFailure('invalid_input', message, details.length > 0 ? details : undefined)
}
