import type { ApiErrorCode } from '@nuxt-app/types'
import type { DomainFailure } from '../../utils/domain-failure'
import { domainFailure } from '../../utils/domain-failure'

// Better Auth raises a fixed vocabulary of `code`s. Only the ones whose meaning
// the HTTP status does not imply need an entry; everything else falls back to
// the status. Better Auth codes never reach clients: the API error contract is
// the only shape on the wire.
const errorByCode: Record<string, ApiErrorCode> = {
  USER_ALREADY_EXISTS: 'conflict',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'conflict',
  SOCIAL_ACCOUNT_ALREADY_LINKED: 'conflict',
  EMAIL_ALREADY_VERIFIED: 'conflict',
  LINKED_ACCOUNT_ALREADY_EXISTS: 'conflict',
  PASSWORD_ALREADY_SET: 'conflict',
  // These arrive as 422 but are server faults, not conflicting input.
  FAILED_TO_CREATE_USER: 'internal_error',
  FAILED_TO_CREATE_SESSION: 'internal_error',
  FAILED_TO_UPDATE_USER: 'internal_error',
  FAILED_TO_GET_SESSION: 'internal_error',
  FAILED_TO_CREATE_VERIFICATION: 'internal_error',
  INVALID_EMAIL_OR_PASSWORD: 'unauthenticated',
  INVALID_PASSWORD: 'unauthenticated',
  INVALID_EMAIL: 'unauthenticated',
  USER_NOT_FOUND: 'unauthenticated',
  INVALID_TOKEN: 'unauthenticated',
  TOKEN_EXPIRED: 'unauthenticated',
  SESSION_EXPIRED: 'unauthenticated',
  EMAIL_NOT_VERIFIED: 'forbidden',
  INVALID_ORIGIN: 'forbidden',
  CROSS_SITE_NAVIGATION_LOGIN_BLOCKED: 'forbidden',
  PASSWORD_TOO_SHORT: 'invalid_input',
  PASSWORD_TOO_LONG: 'invalid_input',
  VALIDATION_ERROR: 'invalid_input',
  MISSING_FIELD: 'invalid_input',
  BODY_MUST_BE_AN_OBJECT: 'invalid_input',
}

const errorByStatus: Record<number, ApiErrorCode> = {
  400: 'invalid_input',
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not_found',
  405: 'not_found',
  409: 'conflict',
  422: 'conflict',
  429: 'rate_limited',
}

function statusFallback(status: number): ApiErrorCode {
  if (status >= 500) {
    return 'internal_error'
  }

  // Unknown 4xx conceal as `not_found`, matching the error adapter.
  return errorByStatus[status] ?? 'not_found'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

// Translates a Better Auth failure into a domain failure. The caller reads the
// response body (or `undefined` when there is none) and throws the result so the
// error adapter renders the API error contract.
export function authFailureFromResponse(status: number, body: unknown): DomainFailure {
  const record = isRecord(body) ? body : {}
  const mapped = typeof record.code === 'string' ? errorByCode[record.code] : undefined
  const error = mapped ?? statusFallback(status)

  // A 5xx message can name internal failures; the contract uses the canned
  // message for `internal_error`. Every other code keeps Better Auth's safe,
  // user-facing message.
  const message = error === 'internal_error' ? undefined : text(record.message)

  return domainFailure(error, message)
}
