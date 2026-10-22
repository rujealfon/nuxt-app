import type { VersionMeta } from '@nuxt-app/config'
import type { Result } from './result'
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

const h3 = vi.hoisted(() => ({
  setHeader: vi.fn(),
  defineEventHandler: vi.fn((handler: unknown) => handler),
  setResponseStatus: vi.fn(),
  setResponseHeaders: vi.fn(),
  getResponseHeader: vi.fn(),
  send: vi.fn((...args: unknown[]) => args),
  logError: vi.fn(),
}))

vi.mock('h3', () => ({
  setHeader: h3.setHeader,
  defineEventHandler: h3.defineEventHandler,
  setResponseStatus: h3.setResponseStatus,
  setResponseHeaders: h3.setResponseHeaders,
  getResponseHeader: h3.getResponseHeader,
  send: h3.send,
}))
vi.mock('nitropack/runtime', () => ({
  defineNitroErrorHandler: vi.fn((handler: unknown) => handler),
}))
vi.mock('./logger', () => ({ useLogger: () => ({ error: h3.logError, warn: vi.fn() }) }))

const { defineVersionedHandler } = await import('./versioned')
const { deprecationHeaders } = await import('./deprecation')
const { err, ok } = await import('./result')
const { failure } = await import('./domain-failure')

const { setHeader } = h3
const { default: errorAdapter } = await import('#server/error-adapter')

type Handler = (event: unknown) => unknown

const adapt = errorAdapter as unknown as (error: unknown, event: unknown) => unknown

// Runs the route and renders any thrown error the way Nitro would.
async function render(handler: Handler, event: unknown) {
  try {
    return { value: await handler(event) }
  }
  catch (error) {
    adapt(error, event)
    const call = h3.send.mock.calls.at(-1) as unknown[]
    return { body: JSON.parse(call[1] as string) as unknown }
  }
}

describe('defineVersionedHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('advertises the version and forwards the event', () => {
    const handler = vi.fn((event: unknown) => event)
    const wrapped = defineVersionedHandler(
      'v1',
      handler as never,
    ) as unknown as (event: unknown) => unknown
    const event = { id: 1 }

    const result = wrapped(event)

    expect(setHeader).toHaveBeenCalledWith(event, 'x-api-version', 'v1')
    expect(handler).toHaveBeenCalledWith(event)
    expect(result).toBe(event)
  })

  it('omits deprecation headers for the live version', () => {
    const wrapped = defineVersionedHandler(
      'v1',
      (() => 'ok') as never,
    ) as unknown as (event: unknown) => unknown

    wrapped({})

    expect(setHeader).not.toHaveBeenCalledWith(expect.anything(), 'deprecation', expect.anything())
  })
})

describe('defineVersionedHandler Result handlers', () => {
  function wrap(handler: unknown) {
    return defineVersionedHandler('v1', handler as never) as unknown as Handler
  }

  it('unwraps an ok Result to its value', () => {
    const value = { message: 'hi' }

    expect(wrap(() => ok(value))({})).toBe(value)
  })

  it('unwraps an async ok Result to its value', async () => {
    const value = { message: 'hi' }

    await expect(wrap(async () => ok(value))({})).resolves.toBe(value)
  })

  it('keeps a sync handler sync', () => {
    expect(wrap(() => ok(1))({})).toBe(1)
  })

  it('throws an err Result as the failure', () => {
    expect(() => wrap(() => err(failure('not_found', 'Gone')))({})).toThrow(
      expect.objectContaining({ error: 'not_found' }),
    )
  })

  it('rejects for an async err Result', async () => {
    await expect(wrap(async () => err(failure('conflict')))({})).rejects.toThrow(
      expect.objectContaining({ error: 'conflict' }),
    )
  })

  it('renders an err as the error contract with the version headers kept', async () => {
    const event = { handled: false, context: {} }
    const details = [{ path: ['name'], message: 'Required' }]

    const { body } = await render(
      wrap(async () => err(failure('invalid_input', 'Bad input', details))),
      event,
    )

    expect(setHeader).toHaveBeenCalledWith(event, 'x-api-version', 'v1')
    expect(h3.setResponseStatus).toHaveBeenCalledWith(event, 400)
    expect(body).toEqual({ error: 'invalid_input', message: 'Bad input', details })
  })

  it('sets the version headers before the handler runs', () => {
    const event = {}
    const handler = vi.fn(() => {
      expect(setHeader).toHaveBeenCalledWith(event, 'x-api-version', 'v1')
      return err(failure('not_found'))
    })

    expect(() => wrap(handler)(event)).toThrow()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['ok', () => ok(ok(1))],
    ['err', () => ok(err(failure('not_found')))],
  ])('fails a Result nested in an %s as internal_error', async (_name, produce) => {
    const { body } = await render(wrap(produce), { handled: false, context: {} })

    expect(body).toMatchObject({ error: 'internal_error' })
    expect(h3.logError).toHaveBeenCalled()
  })

  it('fails an async nested Result as internal_error', async () => {
    const { body } = await render(wrap(async () => ok(ok(1))), { handled: false, context: {} })

    expect(body).toMatchObject({ error: 'internal_error' })
  })

  it.each([
    ['an object property', () => ({ data: ok(1) })],
    ['an array element', () => [ok(1)]],
    ['an ok value', () => ok({ rows: [err(failure('not_found'))] })],
  ])('fails a Result inside the body (%s) as internal_error', async (_name, produce) => {
    const { body } = await render(wrap(produce), { handled: false, context: {} })

    expect(body).toEqual({ error: 'internal_error', message: 'An unexpected error occurred' })
    expect(h3.setResponseStatus).toHaveBeenCalledWith(expect.anything(), 500)
    expect(h3.logError).toHaveBeenCalled()
  })

  it('passes non-plain bodies through untouched', async () => {
    const response = new Response('payload')
    const bytes = new Uint8Array([1])
    const date = new Date()

    expect(wrap(() => response)({})).toBe(response)
    expect(wrap(() => ok(bytes))({})).toBe(bytes)
    await expect(wrap(async () => date)({})).resolves.toBe(date)
    expect(response.bodyUsed).toBe(false)
  })

  it('passes sync and async plain bodies through unchanged', async () => {
    const body = { ok: true, value: 1 }

    expect(wrap(() => body)({})).toBe(body)
    await expect(wrap(async () => body)({})).resolves.toBe(body)
  })

  it('does not unwrap an object that merely looks like a Result', () => {
    const lookAlike = { ok: false, error: 'nope' }

    expect(wrap(() => lookAlike)({})).toBe(lookAlike)
  })

  it('logs an err whose payload is not a Failure and answers internal_error', async () => {
    // The types reject this call; a cast stands in for an untyped caller.
    const { body } = await render(wrap(() => err('x')), { handled: false, context: {} })

    expect(body).toMatchObject({ error: 'internal_error' })
    expect(h3.setResponseStatus).toHaveBeenCalledWith(expect.anything(), 500)
    expect(h3.logError).toHaveBeenCalled()
  })

  it('lets an unexpected throw propagate', () => {
    expect(() => wrap(() => {
      throw new Error('boom')
    })({})).toThrow('boom')
  })
})

describe('defineVersionedHandler body type', () => {
  // The body type a route handler advertises (what Nitro's typed routes read).
  function bodyOf<H extends (event: never) => unknown>(_handler: H): Awaited<ReturnType<H>> {
    return undefined as never
  }

  it('gives the route the unwrapped body type', () => {
    const plain = defineVersionedHandler('v1', () => ({ message: 'hi' }))
    const asyncPlain = defineVersionedHandler('v1', async () => ({ message: 'hi' }))
    const fromOk = defineVersionedHandler('v1', () => ok({ message: 'hi' }))
    const fromResult = defineVersionedHandler('v1', (): Result<{ message: string }> => ok({
      message: 'hi',
    }))
    const fromAsyncResult = defineVersionedHandler(
      'v1',
      async (): Promise<Result<{ message: string }>> => ok({ message: 'hi' }),
    )
    const lookAlike = defineVersionedHandler('v1', () => ({ ok: true as const, value: 1 }))

    expectTypeOf(bodyOf(plain)).toEqualTypeOf<{ message: string }>()
    expectTypeOf(bodyOf(asyncPlain)).toEqualTypeOf<{ message: string }>()
    expectTypeOf(bodyOf(fromOk)).toEqualTypeOf<{ message: string }>()
    expectTypeOf(bodyOf(fromResult)).toEqualTypeOf<{ message: string }>()
    expectTypeOf(bodyOf(fromAsyncResult)).toEqualTypeOf<{ message: string }>()
    expectTypeOf(bodyOf(lookAlike)).toEqualTypeOf<{ ok: true, value: number }>()
  })

  it('accepts an err only when its payload is a Failure', () => {
    const fromFailure = defineVersionedHandler('v1', () => err(failure('not_found')))
    const mixed = defineVersionedHandler(
      'v1',
      (): Result<{ id: number }> => (Math.random() > 1 ? ok({ id: 1 }) : err(failure('conflict'))),
    )

    expectTypeOf(bodyOf(fromFailure)).toEqualTypeOf<never>()
    expectTypeOf(bodyOf(mixed)).toEqualTypeOf<{ id: number }>()

    // @ts-expect-error an err payload that is not a Failure is a type error
    defineVersionedHandler('v1', () => err('x'))
    // @ts-expect-error the same holds for an async handler
    defineVersionedHandler('v1', async () => err({ error: 'not_a_code' }))
    // @ts-expect-error and for a union with an ok result
    defineVersionedHandler('v1', (): Result<number, string> => ok(1))
  })
})

describe('defineVersionedHandler nested Result types', () => {
  // The handlers are only built, never run: the cases are about what compiles.
  it('rejects a Result inside the body', () => {
    // @ts-expect-error a Result in an object property is not a response body
    defineVersionedHandler('v1', () => ({ data: ok(1) }))
    // @ts-expect-error the same holds for an async handler
    defineVersionedHandler('v1', async () => ({ data: err(failure('not_found')) }))
    // @ts-expect-error an array element is checked too
    defineVersionedHandler('v1', () => [ok(1)])
    // @ts-expect-error and a tuple member
    defineVersionedHandler('v1', () => ['x', ok(1)] as [string, Result<number>])
    // @ts-expect-error and a Result nested several levels down
    defineVersionedHandler('v1', () => ({ a: { b: [{ c: ok(1) }] } }))
    // @ts-expect-error and a union branch of a property
    defineVersionedHandler('v1', () => ({ data: Math.random() > 1 ? 1 : ok(1) }))
    // @ts-expect-error and a union branch of the handler's return
    defineVersionedHandler('v1', () => (Math.random() > 1 ? { id: 1 } : { data: ok(1) }))
    // @ts-expect-error and the value of an ok result
    defineVersionedHandler('v1', () => ok({ data: ok(1) }))
    // @ts-expect-error and an ok result inside an ok result
    defineVersionedHandler('v1', () => ok(ok(1)))
    // @ts-expect-error and Result<Result<...>> from a declared return type
    defineVersionedHandler('v1', (): Result<Result<number>> => ok(ok(1)))
    // @ts-expect-error and an async nested ok result
    defineVersionedHandler('v1', async () => ok({ rows: [ok(1)] }))
  })

  it('accepts ordinary bodies', () => {
    interface Node { name: string, children: Node[], parent?: Node | null }
    class Page { constructor(readonly rows: number[]) {} }
    interface Contract {
      id: string
      createdAt: Date
      tags: string[]
      meta: Record<string, unknown>
      owner?: { id: string, email: string | null }
      raw: unknown
      anything: any
      pair: [string, number]
      page: Page
    }

    const bodies = [
      defineVersionedHandler('v1', () => 'text'),
      defineVersionedHandler('v1', () => 1),
      defineVersionedHandler('v1', () => null),
      defineVersionedHandler('v1', () => undefined),
      defineVersionedHandler('v1', () => new Date()),
      defineVersionedHandler('v1', () => [1, 2, 3]),
      defineVersionedHandler('v1', () => ({ a: { b: { c: { d: { e: 1 } } } } })),
      defineVersionedHandler('v1', (): Record<string, number> => ({ a: 1 })),
      defineVersionedHandler('v1', (): { a?: string, b: string | null } => ({ b: null })),
      defineVersionedHandler('v1', (): { raw: unknown } => ({ raw: ok(1) })),
      defineVersionedHandler('v1', (): { raw: any } => ({ raw: ok(1) })),
      defineVersionedHandler('v1', () => new Page([1])),
      defineVersionedHandler('v1', () => new Response('x')),
      defineVersionedHandler('v1', () => new Uint8Array(2)),
      defineVersionedHandler('v1', (): Node => ({ name: 'a', children: [] })),
      defineVersionedHandler('v1', async (): Promise<Contract> => ({}) as Contract),
      defineVersionedHandler('v1', () => ok([{ id: 1 }])),
      defineVersionedHandler('v1', (): Result<Contract> => ok({} as Contract)),
      defineVersionedHandler('v1', () => ({ ok: true as const, value: 1 })),
    ]

    expect(bodies).toHaveLength(19)
  })

  it('does not skip a Result at the scan depth limit by mistake', () => {
    // Four levels below the body is still checked; the type scan and the runtime guard
    // stop at the same depth.
    // @ts-expect-error depth 4 is inside the limit
    defineVersionedHandler('v1', () => ({ a: { b: { c: { d: ok(1) } } } }))
  })
})

describe('deprecationHeaders', () => {
  it('renders the pair for deprecated metadata', () => {
    const meta: VersionMeta = { version: 'v1', deprecated: true, sunset: '2026-12-31' }

    expect(deprecationHeaders(meta)).toEqual([
      ['deprecation', 'true'],
      ['sunset', new Date('2026-12-31').toUTCString()],
    ])
  })

  it('renders nothing for a live version', () => {
    const meta: VersionMeta = { version: 'v1', deprecated: false }

    expect(deprecationHeaders(meta)).toEqual([])
  })
})
