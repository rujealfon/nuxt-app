import type { Failure } from './domain-failure'
import { domainFailureFrom, isFailure } from './domain-failure'

// `ok()` and `err()` mark their objects with a non-enumerable symbol property so
// `isResult` recognises them reliably. A response body that merely looks like
// `{ ok: true, value }` is not a Result, and the mark never appears in
// serialisation, spreads, or `toEqual`. `Symbol.for` keeps the mark shared if
// this module is loaded twice. The types carry the mark too, so a look-alike body
// is not an `Ok` to the compiler either.
const resultBrand: unique symbol = Symbol.for('nuxt-app.result')

// The outcome of a domain operation that can fail in an expected way. Service
// code returns `ok(value)` or `err(failure(...))` for failures a caller can
// act on (invalid input, conflicts, rate limits). Unexpected faults (an
// unreachable database, a bug) still throw; the error adapter maps them to
// `internal_error`. See docs/adr/0005-result-for-domain-failures.md.
export interface Ok<T> {
  readonly ok: true
  readonly value: T
  readonly [resultBrand]: true
}

export interface Err<E> {
  readonly ok: false
  readonly error: E
  readonly [resultBrand]: true
}

export type Result<T, E = Failure> = Ok<T> | Err<E>

function brand<R extends Ok<unknown> | Err<unknown>>(result: Omit<R, typeof resultBrand>): R {
  return Object.defineProperty(result, resultBrand, { value: true }) as R
}

export function ok<T>(value: T): Ok<T> {
  return brand<Ok<T>>({ ok: true, value })
}

export function err<E>(error: E): Err<E> {
  return brand<Err<E>>({ ok: false, error })
}

export function isResult(value: unknown): value is Result<unknown, unknown> {
  return typeof value === 'object'
    && value !== null
    && (value as Record<symbol, unknown>)[resultBrand] === true
}

// How deep below a response body the guards look for a Result: the body is depth 0, its
// properties and array elements depth 1, and so on up to this depth. The runtime scan
// (`findNestedResult`) and the type scan (`HasNestedResult`) use the same bound, so a
// Result buried deeper than this is not caught by either. Four levels cover the response
// shapes this API uses (`{ data: { items: [...] } }`) without walking arbitrary graphs.
export const resultScanDepth = 4

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value) as unknown

  return prototype === Object.prototype || prototype === null
}

// Looks for a Result in `value` and returns the path to the first one, `''` for the
// value itself. Only arrays and plain objects are walked, to `resultScanDepth`: a
// `Response`, stream, `Date`, typed array or class instance is a body the HTTP layer
// serialises or sends on its own, so it is never inspected or consumed. Cycles are safe.
function findNestedResult(
  value: unknown,
  path: string,
  depth: number,
  seen: WeakSet<object>,
): string | undefined {
  if (isResult(value)) {
    return path
  }

  if (typeof value !== 'object' || value === null || depth >= resultScanDepth || seen.has(value)) {
    return undefined
  }

  const walkable = Array.isArray(value) || isPlainObject(value)

  if (!walkable) {
    return undefined
  }

  seen.add(value)

  for (const [key, child] of Object.entries(value)) {
    const found = findNestedResult(child, path ? `${path}.${key}` : key, depth + 1, seen)

    if (found !== undefined) {
      return found
    }
  }

  return undefined
}

// Runtime safety net for route return values: a Result left in a response body (the
// route wrappers unwrap the outer one) must not be serialised, whether it is the body
// itself or sits inside an object or array (`{ data: ok(1) }`). Throwing a plain Error
// makes the error adapter log it and answer `internal_error`. The types catch the same
// mistakes at compile time (`NoNestedResult`); this covers casts and untyped values.
export function assertNotResult<T>(value: T): T {
  const path = findNestedResult(value, '', 0, new WeakSet())

  if (path === undefined) {
    return value
  }

  throw new Error(
    path === ''
      ? 'A route handler returned a Result; unwrap it with unwrapOrThrow.'
      : `A route handler returned a Result nested in its response body at "${path}"; `
        + 'unwrap it before returning.',
  )
}

// The HTTP edge: returns the value, or throws the failure as a `DomainFailure`
// so the error adapter renders the API error contract. `defineResultHandler` and
// `defineVersionedHandler` call it; never call it in service code. An `err` whose
// payload is not a `Failure` (the types forbid it, a cast or untyped caller can
// not) is a bug, not an expected failure: it throws a plain Error so the error
// adapter logs it and answers `internal_error`.
export function unwrapOrThrow<T>(result: Result<T, Failure>): T {
  if (result.ok) {
    return result.value
  }

  if (!isFailure(result.error)) {
    throw new Error('A route handler returned err() with a payload that is not a Failure.')
  }

  throw domainFailureFrom(result.error)
}

type ResultLike = Ok<unknown> | Err<unknown>

// Values the runtime guard never walks into (primitives, functions, and the built-in
// objects a response can carry as is). The type scan skips them for the same reason,
// which also keeps it cheap on large platform types.
type Opaque
  = | string
    | number
    | bigint
    | boolean
    | symbol
    | null
    | undefined
    | ((...args: never[]) => unknown)
    | Date
    | RegExp
    | Promise<unknown>
    | ArrayBuffer
    | ArrayBufferView
    | Blob
    | Request
    | Response
    | Headers
    | ReadableStream
    | URL
    | Map<unknown, unknown>
    | Set<unknown>

type IsAny<T> = 0 extends 1 & T ? true : false

// `true` when `T`, or a property, array element, tuple member or union member of `T`
// down to `resultScanDepth` (4) levels, is an `Ok` or `Err`. `D` counts the levels
// walked, so the recursion is bounded. `any` and `unknown` never match. Distributes over
// unions: the result is `true` if any member matches, so test it with `true extends`.
type HasNestedResult<T, D extends unknown[] = []> = IsAny<T> extends true
  ? false
  : T extends ResultLike
    ? true
    : D['length'] extends typeof resultScanDepth
      ? false
      : T extends Opaque
        ? false
        : T extends readonly (infer E)[]
          ? HasNestedResult<E, [...D, 0]>
          : true extends { [K in keyof T]-?: HasNestedResult<T[K], [...D, 0]> }[keyof T]
            ? true
            : false

// The value a route sends for a handler return `R`: an `Ok<T>` contributes `T`, an
// `Err` contributes nothing, and any other value is the body as is.
type ResultBody<R> = R extends Ok<infer T> ? T : R extends Err<unknown> ? never : R

// Resolves to `never` when the response body `T` holds a Result at any depth up to
// `resultScanDepth`, `unknown` otherwise. `defineResultHandler` applies it to the value
// of its `Result`.
export type NoNestedResult<T> = true extends HasNestedResult<T> ? never : unknown

// The handler return types `defineVersionedHandler` and `defineResultHandler` accept:
// any `Err` in the union must carry a `Failure`, so `err('x')` fails to compile instead
// of becoming a 500, and the response body (an `Ok`'s value or a plain body) must not
// contain a `Result`, so `{ data: ok(1) }` and `ok(ok(1))` fail to compile too. Use as
// `R extends ValidResult<R>`; it resolves to `never` otherwise.
export type ValidResult<R> = [Extract<R, Err<unknown>>] extends [Err<Failure>]
  ? NoNestedResult<ResultBody<R>>
  : never
