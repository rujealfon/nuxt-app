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

// Renders every product failure as the product error contract and normalizes
// unexpected failures to `internal_error`. Controlled responses from infra
// routes (Better Auth, health) are written as Responses and never reach here.
export default defineNitroErrorHandler((error, event) => {
  if (event.handled) {
    return
  }

  const failure = toProductFailure(error)
  const code = failure?.code ?? 'internal_error'

  if (code === 'internal_error') {
    const logger: Logger = event.context.logger || useLogger()
    logger.error({ err: error }, 'unhandled error')
  }

  const body: ProductError & { stack?: string } = {
    error: code,
    message: failure?.message ?? productFailureMessages.internal_error,
  }

  if (!failure && import.meta.dev && error instanceof Error && error.stack) {
    body.stack = error.stack
  }

  setResponseStatus(event, statusByCode[code])

  return send(event, JSON.stringify(body), 'application/json')
})
