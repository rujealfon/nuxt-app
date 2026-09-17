import type { Logger } from '@nuxt-app/logger'
import type { ApiError, ApiErrorCode, InputDetail } from '@nuxt-app/types'
import { apiErrorSchema, inputDetailSchema } from '@nuxt-app/types'
import { DomainFailure, domainFailureMessages } from './utils/domain-failure'

const statusByError: Record<ApiErrorCode, number> = {
  invalid_input: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  internal_error: 500,
}

const errorByStatus: Partial<Record<number, ApiErrorCode>> = {
  400: 'invalid_input',
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not_found',
  405: 'invalid_input',
  409: 'conflict',
  429: 'rate_limited',
}

// h3 wraps a thrown non-H3 error in a new H3Error, keeping the original as
// `cause`; recognise a domain failure at either level.
function toDomainFailure(error: unknown): DomainFailure | undefined {
  if (error instanceof DomainFailure) {
    return error
  }

  if (error instanceof Error && error.cause instanceof DomainFailure) {
    return error.cause
  }

  return undefined
}

function statusCodeOf(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('statusCode' in error)) {
    return undefined
  }

  return typeof error.statusCode === 'number' ? error.statusCode : undefined
}

function isUnhandled(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  return Boolean(
    ('unhandled' in error && error.unhandled)
    || ('fatal' in error && error.fatal),
  )
}

// Framework 4xx (method-not-allowed, missing pages, validation) must stay
// client errors. Only unhandled/fatal/missing-status failures become 500.
function errorFromH3(error: unknown): ApiErrorCode | undefined {
  if (isUnhandled(error)) {
    return undefined
  }

  const status = statusCodeOf(error)

  if (status === undefined) {
    return undefined
  }

  if (errorByStatus[status]) {
    return errorByStatus[status]
  }

  if (status >= 400 && status < 500) {
    return 'invalid_input'
  }

  return undefined
}

const cannedInternalError: ApiError = {
  error: 'internal_error',
  message: domainFailureMessages.internal_error,
}

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

function apiErrorBody(
  error: ApiErrorCode,
  failure: DomainFailure | undefined,
  logger: Logger,
): ApiError {
  const fallbackMessage = domainFailureMessages[error]
  const details = usableInputDetails(error, failure?.details)
  const candidate: ApiError = details
    ? { error, message: failure?.message ?? fallbackMessage, details }
    : { error, message: failure?.message ?? fallbackMessage }

  const parsed = apiErrorSchema.safeParse(candidate)

  if (error === 'invalid_input' && failure?.details && details?.length !== failure.details.length) {
    logger.warn({ error }, 'dropped unusable input details')
  }

  if (parsed.success) {
    return parsed.data
  }

  logger.warn({ error }, 'dropped unusable API error message override')

  const fallbackCandidate: ApiError = details
    ? { error, message: fallbackMessage, details }
    : { error, message: fallbackMessage }
  const fallback = apiErrorSchema.safeParse(fallbackCandidate)

  if (fallback.success) {
    return fallback.data
  }

  logger.error({ error }, 'API error contract unusable')
  return cannedInternalError
}

// Renders every domain failure as the API error contract. H3 4xx map onto
// the same contract; unexpected failures become `internal_error`. Controlled
// responses from infra routes (Better Auth, health) are written as Responses
// and never reach here.
export default defineNitroErrorHandler((error, event) => {
  if (event.handled) {
    return
  }

  const failure = toDomainFailure(error)
  const bodyError = failure?.error ?? errorFromH3(error) ?? 'internal_error'
  const logger: Logger = event.context.logger || useLogger()

  if (!failure && bodyError === 'internal_error') {
    logger.error({ err: error }, 'unhandled error')
  }

  const body = apiErrorBody(bodyError, failure, logger)

  setResponseStatus(event, statusByError[body.error])

  return send(event, JSON.stringify(body), 'application/json')
})
