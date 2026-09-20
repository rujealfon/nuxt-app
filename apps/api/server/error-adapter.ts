import type { Logger } from '@nuxt-app/logger'
import type { ApiError, ApiErrorCode } from '@nuxt-app/types'
import { apiError } from '@nuxt-app/types'
import { getResponseHeader, send, setResponseHeaders, setResponseStatus } from 'h3'
import { defineNitroErrorHandler } from 'nitropack/runtime'
import { DomainFailure } from './utils/domain-failure'
import { useLogger } from './utils/logger'

// The one status table. `errorByStatus` is derived from it so the two can
// never drift; a new code only has to be added here.
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

// Framework 4xx stay client errors. Unknown URL/method on this API-only app
// is `not_found`, not field validation. Only statuses in `statusByError`
// map onto a dedicated code; leftover 4xx are concealed as `not_found`.
function errorFromH3(error: unknown): ApiErrorCode | undefined {
  if (isUnhandled(error)) {
    return undefined
  }

  const status = statusCodeOf(error)

  if (status === undefined) {
    return undefined
  }

  const mapped = errorByStatus[status]
  if (mapped) {
    return mapped
  }

  return status >= 400 && status < 500 ? 'not_found' : undefined
}

function apiErrorBody(
  error: ApiErrorCode,
  failure: DomainFailure | undefined,
  logger: Logger,
): ApiError {
  const body = apiError(error, failure?.message, failure?.details)
  const kept = body.error === 'invalid_input' ? body.details?.length ?? 0 : 0

  if (error === 'invalid_input' && failure?.details && kept !== failure.details.length) {
    logger.warn({ error }, 'dropped unusable input details')
  }

  return body
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
  const status = statusByError[body.error]

  setResponseStatus(event, status)
  setResponseHeaders(event, {
    'content-type': 'application/json',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'content-security-policy': 'script-src \'none\'; frame-ancestors \'none\';',
    ...((status === 404 || !getResponseHeader(event, 'cache-control'))
      ? { 'cache-control': 'no-cache' }
      : {}),
  })

  return send(event, JSON.stringify(body), 'application/json')
})
