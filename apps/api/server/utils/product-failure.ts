import type { ProductErrorCode } from '@nuxt-app/types'

export const productFailureMessages: Record<ProductErrorCode, string> = {
  invalid_input: 'The request was invalid',
  unauthenticated: 'Sign in is required',
  forbidden: 'You do not have access to this resource',
  not_found: 'The requested resource was not found',
  conflict: 'The request conflicts with the current state',
  rate_limited: 'Too many requests',
  internal_error: 'An unexpected error occurred',
}

// A failure raised by product code, independent of how it reaches the client.
// The error adapter maps the code to an HTTP status and the product error
// contract; product code never picks a status.
export class ProductFailure extends Error {
  readonly code: ProductErrorCode

  constructor(code: ProductErrorCode, message?: string) {
    super(message ?? productFailureMessages[code])
    this.name = 'ProductFailure'
    this.code = code
  }
}

export function productFailure(code: ProductErrorCode, message?: string): ProductFailure {
  return new ProductFailure(code, message)
}
