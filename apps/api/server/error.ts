import type { Logger } from '@nuxt-app/logger'
import type { ProductError, ProductErrorCode } from '@nuxt-app/types'
import { ProductFailure, productFailureMessages } from './utils/product-failure'

const statusByCode: Record<ProductErrorCode, number> = {
  invalid_input: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  internal_error: 500,
}

const codeByStatus: Partial<Record<number, ProductErrorCode>> = {
  400: 'invalid_input',
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not_found',
  405: 'invalid_input',
  409: 'conflict',
  429: 'rate_limited',
}

// h3 wraps a thrown non-H3 error in a new H3Error, keeping the original as
// `cause`; recognise a product failure at either level.
function toProductFailure(error: unknown): ProductFailure | undefined {
  if (error instanceof ProductFailure) {
    return error
  }

  if (error instanceof Error && error.cause instanceof ProductFailure) {
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
function codeFromH3(error: unknown): ProductErrorCode | undefined {
  if (isUnhandled(error)) {
    return undefined
  }

  const status = statusCodeOf(error)

  if (status === undefined) {
    return undefined
  }

  if (codeByStatus[status]) {
    return codeByStatus[status]
  }

  if (status >= 400 && status < 500) {
    return 'invalid_input'
  }

  return undefined
}

// Renders every product failure as the product error contract. H3 4xx map onto
// the same contract; unexpected failures become `internal_error`. Controlled
// responses from infra routes (Better Auth, health) are written as Responses
// and never reach here.
export default defineNitroErrorHandler((error, event) => {
  if (event.handled) {
    return
  }

  const failure = toProductFailure(error)
  const code = failure?.code ?? codeFromH3(error) ?? 'internal_error'

  if (!failure && code === 'internal_error') {
    const logger: Logger = event.context.logger || useLogger()
    logger.error({ err: error }, 'unhandled error')
  }

  const body: ProductError = {
    error: code,
    message: failure?.message ?? productFailureMessages[code],
  }

  setResponseStatus(event, statusByCode[code])

  return send(event, JSON.stringify(body), 'application/json')
})
