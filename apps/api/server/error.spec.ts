import type { ProductErrorCode } from '@nuxt-app/types'
import { productErrorCodes } from '@nuxt-app/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const setResponseStatus = vi.fn()
const send = vi.fn((...args: unknown[]) => args)
const loggerError = vi.fn()
const useLogger = vi.fn(() => ({ error: loggerError }))

vi.stubGlobal('defineNitroErrorHandler', vi.fn((handler: unknown) => handler))
vi.stubGlobal('setResponseStatus', setResponseStatus)
vi.stubGlobal('send', send)
vi.stubGlobal('useLogger', useLogger)

const { default: errorHandler } = await import('./error')
const { productFailure } = await import('./utils/product-failure')

type ErrorHandler = (error: unknown, event: unknown) => unknown

const handle = errorHandler as unknown as ErrorHandler

const statuses: Record<ProductErrorCode, number> = {
  invalid_input: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  internal_error: 500,
}

function makeEvent(context: Record<string, unknown> = {}) {
  return { handled: false, context }
}

function sentBody(call: unknown[]): Record<string, unknown> {
  return JSON.parse(call[1] as string)
}

function h3Error(statusCode: number, extras: Record<string, unknown> = {}) {
  return Object.assign(new Error('h3'), { statusCode, ...extras })
}

describe('error adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(productErrorCodes.map(code => [code, statuses[code]] as const))(
    'renders %s as %i with the product error contract',
    (code, status) => {
      const event = makeEvent()

      handle(productFailure(code, 'A message'), event)

      expect(setResponseStatus).toHaveBeenCalledWith(event, status)
      expect(send).toHaveBeenCalledWith(
        event,
        JSON.stringify({ error: code, message: 'A message' }),
        'application/json',
      )
    },
  )

  it('recognises a failure wrapped by h3', () => {
    const event = makeEvent()
    const wrapped = Object.assign(new Error('wrapped'), { cause: productFailure('not_found') })

    handle(wrapped, event)

    expect(setResponseStatus).toHaveBeenCalledWith(event, 404)
    expect(sentBody(send.mock.calls[0] as unknown[])).toEqual({
      error: 'not_found',
      message: 'The requested resource was not found',
    })
  })

  it.each([
    [400, 'invalid_input', 'The request was invalid'],
    [401, 'unauthenticated', 'Sign in is required'],
    [403, 'forbidden', 'You do not have access to this resource'],
    [404, 'not_found', 'The requested resource was not found'],
    [405, 'invalid_input', 'The request was invalid'],
    [409, 'conflict', 'The request conflicts with the current state'],
    [429, 'rate_limited', 'Too many requests'],
  ] as const)('maps H3 %i onto %s', (status, code, message) => {
    const event = makeEvent()

    handle(h3Error(status), event)

    expect(setResponseStatus).toHaveBeenCalledWith(event, statuses[code])
    expect(sentBody(send.mock.calls[0] as unknown[])).toEqual({ error: code, message })
    expect(loggerError).not.toHaveBeenCalled()
  })

  it('maps an unknown 4xx onto invalid_input', () => {
    const event = makeEvent()

    handle(h3Error(422), event)

    expect(setResponseStatus).toHaveBeenCalledWith(event, 400)
    expect(sentBody(send.mock.calls[0] as unknown[])).toEqual({
      error: 'invalid_input',
      message: 'The request was invalid',
    })
    expect(loggerError).not.toHaveBeenCalled()
  })

  it('treats unhandled H3 4xx as internal_error', () => {
    const event = makeEvent()

    handle(h3Error(404, { unhandled: true }), event)

    expect(setResponseStatus).toHaveBeenCalledWith(event, 500)
    expect(sentBody(send.mock.calls[0] as unknown[])).toEqual({
      error: 'internal_error',
      message: 'An unexpected error occurred',
    })
    expect(loggerError).toHaveBeenCalled()
  })

  it('normalizes an unexpected error to internal_error without leaking its message', () => {
    const event = makeEvent()

    handle(new Error('database exploded'), event)

    expect(setResponseStatus).toHaveBeenCalledWith(event, 500)
    const body = sentBody(send.mock.calls[0] as unknown[])
    expect(body).toEqual({ error: 'internal_error', message: 'An unexpected error occurred' })
    expect(body.stack).toBeUndefined()
    expect(loggerError).toHaveBeenCalled()
  })

  it('prefers the request-scoped logger', () => {
    const requestLoggerError = vi.fn()
    const event = makeEvent({ logger: { error: requestLoggerError } })

    handle(new Error('boom'), event)

    expect(requestLoggerError).toHaveBeenCalled()
    expect(useLogger).not.toHaveBeenCalled()
  })

  it('does nothing when the response is already handled', () => {
    const event = { handled: true, context: {} }

    handle(new Error('late'), event)

    expect(send).not.toHaveBeenCalled()
    expect(setResponseStatus).not.toHaveBeenCalled()
  })
})
