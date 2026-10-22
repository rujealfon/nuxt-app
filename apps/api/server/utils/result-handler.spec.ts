import type { Result } from './result'
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  defineEventHandler: vi.fn((handler: unknown) => handler),
  setResponseStatus: vi.fn(),
  setResponseHeaders: vi.fn(),
  getResponseHeader: vi.fn(),
  send: vi.fn((...args: unknown[]) => args),
  logError: vi.fn(),
}))

vi.mock('h3', () => ({
  defineEventHandler: mocks.defineEventHandler,
  setResponseStatus: mocks.setResponseStatus,
  setResponseHeaders: mocks.setResponseHeaders,
  getResponseHeader: mocks.getResponseHeader,
  send: mocks.send,
}))
vi.mock('nitropack/runtime', () => ({
  defineNitroErrorHandler: vi.fn((handler: unknown) => handler),
}))
vi.mock('./logger', () => ({ useLogger: () => ({ error: mocks.logError, warn: vi.fn() }) }))

const { defineResultHandler } = await import('./result-handler')
const { default: errorAdapter } = await import('#server/error-adapter')
const { failure } = await import('./domain-failure')
const { err, ok } = await import('./result')

type Handler = (event: unknown) => Promise<unknown>

const adapt = errorAdapter as unknown as (error: unknown, event: unknown) => unknown

// Runs the route and renders any thrown error the way Nitro would.
async function render(handler: Handler, event: unknown) {
  try {
    return { value: await handler(event) }
  }
  catch (error) {
    adapt(error, event)
    const call = mocks.send.mock.calls.at(-1) as unknown[]
    return { body: JSON.parse(call[1] as string) as unknown }
  }
}

describe('defineResultHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the value of an ok result and forwards the event', async () => {
    const event = { handled: false, context: {} }
    const value = { id: 1 }
    const fn = vi.fn(() => ok(value))
    const handler = defineResultHandler(fn) as unknown as Handler

    await expect(handler(event)).resolves.toBe(value)
    expect(fn).toHaveBeenCalledWith(event)
  })

  it('awaits an async operation', async () => {
    const handler = defineResultHandler(async () => ok('done')) as unknown as Handler

    await expect(handler({})).resolves.toBe('done')
  })

  it('renders an err as the API error contract', async () => {
    const details = [{ path: ['email'], message: 'Invalid' }]
    const handler = defineResultHandler(
      async () => err(failure('invalid_input', 'Bad input', details)),
    ) as unknown as Handler

    const { body } = await render(handler, { handled: false, context: {} })

    expect(mocks.setResponseStatus).toHaveBeenCalledWith(expect.anything(), 400)
    expect(body).toEqual({ error: 'invalid_input', message: 'Bad input', details })
  })

  it('renders an unexpected throw as internal_error and logs it', async () => {
    const handler = defineResultHandler(() => {
      throw new Error('database down')
    }) as unknown as Handler

    const { body } = await render(handler, { handled: false, context: {} })

    expect(mocks.setResponseStatus).toHaveBeenCalledWith(expect.anything(), 500)
    expect(body).toEqual({ error: 'internal_error', message: 'An unexpected error occurred' })
    expect(mocks.logError).toHaveBeenCalled()
  })

  it('logs an err that is not a Failure as internal_error', async () => {
    // @ts-expect-error the types reject a non-Failure payload; the runtime check still guards a cast
    const typed = defineResultHandler(() => err('x'))
    const handler = typed as unknown as Handler

    const { body } = await render(handler, { handled: false, context: {} })

    expect(mocks.setResponseStatus).toHaveBeenCalledWith(expect.anything(), 500)
    expect(body).toMatchObject({ error: 'internal_error' })
    expect(mocks.logError).toHaveBeenCalled()
  })

  it('fails a nested Result value as internal_error', async () => {
    const handler = defineResultHandler(() => ok(ok(1)) as never) as unknown as Handler

    const { body } = await render(handler, { handled: false, context: {} })

    expect(body).toMatchObject({ error: 'internal_error' })
    expect(mocks.logError).toHaveBeenCalled()
  })
})

describe('defineResultHandler nested Result', () => {
  it('fails a Result nested in the value as internal_error and logs it', async () => {
    // The types reject this call; a cast stands in for an untyped caller.
    const handler = defineResultHandler(() => ok({ data: ok(1) }) as never) as unknown as Handler

    const { body } = await render(handler, { handled: false, context: {} })

    expect(mocks.setResponseStatus).toHaveBeenCalledWith(expect.anything(), 500)
    expect(body).toEqual({ error: 'internal_error', message: 'An unexpected error occurred' })
    expect(mocks.logError).toHaveBeenCalled()
  })

  it('returns non-plain values such as a Response untouched', async () => {
    const response = new Response('payload')
    const handler = defineResultHandler(async () => ok(response)) as unknown as Handler

    await expect(handler({})).resolves.toBe(response)
    expect(response.bodyUsed).toBe(false)
  })

  it('rejects a Result inside the value at compile time', () => {
    // @ts-expect-error the value of the Result must not contain a Result
    defineResultHandler(() => ok({ data: ok(1) }))
    // @ts-expect-error nor an array of Results
    defineResultHandler(async () => ok([ok(1)]))
    // @ts-expect-error nor a Result<Result<...>>
    defineResultHandler(async (): Promise<Result<Result<number>>> => ok(ok(1)))
    // @ts-expect-error nor a union branch
    defineResultHandler(() => (Math.random() > 1 ? ok({ id: 1 }) : ok({ data: ok(1) })))
  })

  it('accepts ordinary values and keeps the value type', () => {
    const plain = defineResultHandler(async () => ok({ id: 1, tags: ['a'], at: new Date() }))
    const response = defineResultHandler(
      async (): Promise<Result<Response>> => ok(new Response(null)),
    )
    const fallible = defineResultHandler(
      async (): Promise<Result<{ id: number }>> => err(failure('not_found')),
    )

    expectTypeOf(plain).returns.toEqualTypeOf<Promise<{ id: number, tags: string[], at: Date }>>()
    expectTypeOf(response).returns.toEqualTypeOf<Promise<Response>>()
    expectTypeOf(fallible).returns.toEqualTypeOf<Promise<{ id: number }>>()
  })
})
