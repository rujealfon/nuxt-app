import type { NoNestedResult, Result } from './result'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { DomainFailure, failure } from './domain-failure'
import { assertNotResult, err, isResult, ok, resultScanDepth, unwrapOrThrow } from './result'

describe('ok and err', () => {
  it('build discriminated plain values', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 })
    expect(err('nope')).toEqual({ ok: false, error: 'nope' })
  })
})

describe('unwrapOrThrow', () => {
  it('returns the value of an ok result', () => {
    const value = { id: 1 }

    expect(unwrapOrThrow(ok(value))).toBe(value)
  })

  it('returns an undefined value without throwing', () => {
    expect(unwrapOrThrow(ok(undefined))).toBeUndefined()
  })

  it('throws an err failure as a DomainFailure with its fields', () => {
    const details = [{ path: ['email'], message: 'Invalid' }]
    let caught: unknown

    try {
      unwrapOrThrow(err(failure('invalid_input', 'Bad input', details)))
    }
    catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(DomainFailure)
    expect(caught).toMatchObject({ error: 'invalid_input', message: 'Bad input', details })
  })
})

describe('unwrapOrThrow with a payload that is not a Failure', () => {
  it.each([
    ['a string', 'x'],
    ['an unknown code', { error: 'nope', message: 'Nope' }],
    ['a missing message', { error: 'not_found' }],
    ['null', null],
  ])('throws a plain Error, not a DomainFailure, for %s', (_name, payload) => {
    const call = () => unwrapOrThrow(err(payload) as never)

    expect(call).toThrow(Error)
    expect(call).not.toThrow(DomainFailure)
    expect(call).toThrow('not a Failure')
  })
})

describe('isResult', () => {
  it('recognises values built by ok and err', () => {
    expect(isResult(ok(1))).toBe(true)
    expect(isResult(ok(undefined))).toBe(true)
    expect(isResult(err(failure('not_found')))).toBe(true)
  })

  it('does not recognise look-alike response bodies', () => {
    expect(isResult({ ok: true, value: 1 })).toBe(false)
    expect(isResult({ ok: false, error: 'x' })).toBe(false)
    expect(isResult({ ...ok(1) })).toBe(false)
  })

  it('rejects non-object values', () => {
    expect(isResult(undefined)).toBe(false)
    expect(isResult(null)).toBe(false)
    expect(isResult('ok')).toBe(false)
    expect(isResult(1)).toBe(false)
    expect(isResult(new Response(null))).toBe(false)
  })

  it('keeps the brand out of serialisation and enumeration', () => {
    const result = ok({ id: 1 })

    expect(JSON.stringify(result)).toBe('{"ok":true,"value":{"id":1}}')
    expect(Object.keys(result)).toEqual(['ok', 'value'])
  })
})

describe('assertNotResult', () => {
  it('returns ordinary values unchanged', () => {
    const body = { ok: true, value: 1 }

    expect(assertNotResult(body)).toBe(body)
    expect(assertNotResult(undefined)).toBeUndefined()
  })

  it('throws for a Result', () => {
    expect(() => assertNotResult(ok(1))).toThrow('unwrap it with unwrapOrThrow')
    expect(() => assertNotResult(err(failure('conflict')))).toThrow(Error)
  })
})

describe('assertNotResult on nested bodies', () => {
  const nested = ok(1)

  it.each([
    ['an object property', { data: nested }, 'data'],
    ['an array element', [1, nested], '1'],
    ['a deep property', { a: { b: [{ c: err(failure('conflict')) }] } }, 'a.b.0.c'],
    ['a null-prototype object', Object.assign(Object.create(null), { data: nested }), 'data'],
    ['the deepest scanned level', { a: { b: { c: { d: nested } } } }, 'a.b.c.d'],
  ])('throws for a Result in %s and names its path', (_name, body, path) => {
    expect(() => assertNotResult(body)).toThrow(Error)
    expect(() => assertNotResult(body)).toThrow(`"${path}"`)
  })

  it('stops at the documented depth', () => {
    expect(resultScanDepth).toBe(4)
    expect(() => assertNotResult({ a: { b: { c: { d: { e: nested } } } } })).not.toThrow()
  })

  it('returns an ordinary body unchanged', () => {
    const body = { id: 1, tags: ['a'], owner: { email: null }, look: { ok: true, value: 1 } }

    expect(assertNotResult(body)).toBe(body)
  })

  it('survives a cyclic body', () => {
    const body: Record<string, unknown> = { id: 1 }
    body.self = body
    body.list = [body]

    expect(assertNotResult(body)).toBe(body)
    body.late = nested
    expect(() => assertNotResult(body)).toThrow('"late"')
  })

  it('does not inspect or consume non-plain bodies', () => {
    class Page {
      rows = [nested]
    }
    const response = new Response('payload')
    const stream = new ReadableStream()
    const bytes = new Uint8Array([1, 2])
    const date = new Date()
    const page = new Page()
    const map = new Map([['a', nested]])
    const bodies = [response, stream, bytes, date, page, map, new Set([nested])]

    for (const body of bodies) {
      expect(assertNotResult(body)).toBe(body)
    }

    expect(response.bodyUsed).toBe(false)
    expect(stream.locked).toBe(false)
  })

  it('does not read through getters on class instances or call functions', () => {
    let calls = 0
    const body = {
      fn: () => {
        calls++
        return nested
      },
    }

    expect(assertNotResult(body)).toBe(body)
    expect(calls).toBe(0)
  })
})

describe('noNestedResult', () => {
  it('resolves to never for a body holding a Result', () => {
    expectTypeOf<NoNestedResult<{ data: ReturnType<typeof ok<number>> }>>().toEqualTypeOf<never>()
    expectTypeOf<NoNestedResult<Result<number>[]>>().toEqualTypeOf<never>()
    expectTypeOf<NoNestedResult<[string, Result<number>]>>().toEqualTypeOf<never>()
    expectTypeOf<NoNestedResult<{ a: number } | { b: Result<number> }>>().toEqualTypeOf<never>()
    expectTypeOf<NoNestedResult<{ a?: Result<number> | null }>>().toEqualTypeOf<never>()
    expectTypeOf<NoNestedResult<Result<Result<number>>>>().toEqualTypeOf<never>()
  })

  it('resolves to unknown for ordinary bodies', () => {
    interface Tree { name: string, children: Tree[] }

    expectTypeOf<NoNestedResult<string>>().toEqualTypeOf<unknown>()
    expectTypeOf<NoNestedResult<never>>().toEqualTypeOf<unknown>()
    expectTypeOf<NoNestedResult<unknown>>().toEqualTypeOf<unknown>()
    expectTypeOf<NoNestedResult<any>>().toEqualTypeOf<unknown>()
    expectTypeOf<NoNestedResult<{ raw: unknown, any: any }>>().toEqualTypeOf<unknown>()
    expectTypeOf<NoNestedResult<Date | Uint8Array | Response>>().toEqualTypeOf<unknown>()
    expectTypeOf<NoNestedResult<Record<string, number[]>>>().toEqualTypeOf<unknown>()
    expectTypeOf<NoNestedResult<{ a?: string, b: null | undefined }>>().toEqualTypeOf<unknown>()
    expectTypeOf<NoNestedResult<Tree>>().toEqualTypeOf<unknown>()
    expectTypeOf<NoNestedResult<{ a: { b: { c: { d: { e: number } } } } }>>()
      .toEqualTypeOf<unknown>()
  })
})
