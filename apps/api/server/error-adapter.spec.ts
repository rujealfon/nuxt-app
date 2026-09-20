import { apiErrorCodes } from '@nuxt-app/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const loggerError = vi.fn()
  const loggerWarn = vi.fn()
  return {
    setResponseStatus: vi.fn(),
    setResponseHeaders: vi.fn(),
    getResponseHeader: vi.fn(),
    send: vi.fn((...args: unknown[]) => args),
    loggerError,
    loggerWarn,
    useLogger: vi.fn(() => ({ error: loggerError, warn: loggerWarn })),
  }
})

vi.mock('h3', () => ({
  setResponseStatus: mocks.setResponseStatus,
  setResponseHeaders: mocks.setResponseHeaders,
  getResponseHeader: mocks.getResponseHeader,
  send: mocks.send,
}))

vi.mock('nitropack/runtime', () => ({
  defineNitroErrorHandler: vi.fn((handler: unknown) => handler),
}))

vi.mock('./utils/logger', () => ({ useLogger: mocks.useLogger }))

const { default: errorHandler, statusByError: statuses } = await import('./error-adapter')
const { domainFailure } = await import('./utils/domain-failure')

const {
  setResponseStatus,
  setResponseHeaders,
  send,
  useLogger,
  loggerError,
  loggerWarn,
} = mocks

type ErrorHandler = (error: unknown, event: unknown) => unknown

const handle = errorHandler as unknown as ErrorHandler

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

  it.each(apiErrorCodes.map(code => [code, statuses[code]] as const))(
    'renders %s as %i with the API error contract',
    (code, status) => {
      const event = makeEvent()

      handle(domainFailure(code, 'A message'), event)

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
    const wrapped = Object.assign(new Error('wrapped'), { cause: domainFailure('not_found') })

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

  it('maps an unmapped 4xx onto invalid_input, not not_found', () => {
    const event = makeEvent()

    handle(h3Error(422), event)

    expect(setResponseStatus).toHaveBeenCalledWith(event, 400)
    expect(sentBody(send.mock.calls[0] as unknown[])).toEqual({
      error: 'invalid_input',
      message: 'The request was invalid',
    })
    expect(loggerError).not.toHaveBeenCalled()
  })

  it('sets Nitro hardening headers on the JSON body', () => {
    const event = makeEvent()

    handle(domainFailure('not_found'), event)

    expect(setResponseHeaders).toHaveBeenCalledWith(event, expect.objectContaining({
      'content-type': 'application/json',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'content-security-policy': 'script-src \'none\'; frame-ancestors \'none\';',
      'cache-control': 'no-cache',
    }))
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

  it('keeps `error` when an override message is empty', () => {
    const event = makeEvent()

    handle(domainFailure('not_found', ''), event)

    expect(setResponseStatus).toHaveBeenCalledWith(event, 404)
    expect(sentBody(send.mock.calls[0] as unknown[])).toEqual({
      error: 'not_found',
      message: 'The requested resource was not found',
    })
  })

  it('includes input details on invalid_input', () => {
    const event = makeEvent()

    handle(domainFailure('invalid_input', undefined, [
      { path: ['email'], message: 'Enter a valid email address' },
      { path: ['password'], message: 'Password is required' },
    ]), event)

    expect(setResponseStatus).toHaveBeenCalledWith(event, 400)
    expect(sentBody(send.mock.calls[0] as unknown[])).toEqual({
      error: 'invalid_input',
      message: 'The request was invalid',
      details: [
        { path: ['email'], message: 'Enter a valid email address' },
        { path: ['password'], message: 'Password is required' },
      ],
    })
  })

  it('omits input details on a code other than invalid_input', () => {
    const event = makeEvent()

    handle(domainFailure('not_found', undefined, [
      { path: ['id'], message: 'Missing' },
    ]), event)

    expect(sentBody(send.mock.calls[0] as unknown[])).toEqual({
      error: 'not_found',
      message: 'The requested resource was not found',
    })
  })

  it('omits details when every input detail is unusable', () => {
    const event = makeEvent()

    handle(domainFailure('invalid_input', undefined, [
      { path: ['email'], message: '' },
    ]), event)

    expect(sentBody(send.mock.calls[0] as unknown[])).toEqual({
      error: 'invalid_input',
      message: 'The request was invalid',
    })
    expect(loggerWarn).toHaveBeenCalledWith({ error: 'invalid_input' }, expect.any(String))
  })

  it('falls back to the canned message when the override is empty and details are unusable', () => {
    const event = makeEvent()

    handle(domainFailure('invalid_input', '', [
      { path: ['email'], message: '' },
    ]), event)

    expect(sentBody(send.mock.calls[0] as unknown[])).toEqual({
      error: 'invalid_input',
      message: 'The request was invalid',
    })
    expect(loggerWarn).toHaveBeenCalledWith({ error: 'invalid_input' }, expect.any(String))
  })

  it('keeps usable input details and drops the rest', () => {
    const event = makeEvent()

    handle(domainFailure('invalid_input', undefined, [
      { path: ['email'], message: 'Enter a valid email address' },
      { path: ['password'], message: '' },
    ]), event)

    expect(sentBody(send.mock.calls[0] as unknown[])).toEqual({
      error: 'invalid_input',
      message: 'The request was invalid',
      details: [{ path: ['email'], message: 'Enter a valid email address' }],
    })
  })

  it('does not map a thrown ZodError onto invalid_input', async () => {
    const { z } = await import('zod')
    const event = makeEvent()
    let zodError: unknown

    try {
      z.string().parse(1)
    }
    catch (error) {
      zodError = error
    }

    handle(zodError, event)

    expect(sentBody(send.mock.calls[0] as unknown[])).toEqual({
      error: 'internal_error',
      message: 'An unexpected error occurred',
    })
    expect(loggerError).toHaveBeenCalled()
  })
})
