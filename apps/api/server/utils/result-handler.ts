import type { EventHandler, EventHandlerRequest, H3Event } from 'h3'
import type { Ok, Result, ValidResult } from './result'
import { defineEventHandler } from 'h3'
import { assertNotResult, unwrapOrThrow } from './result'

// The value a route sends for a handler's `Result`: the `T` of its `Ok<T>`.
type ResultValue<R> = R extends Ok<infer T> ? T : never

// A route handler for an operation that returns a `Result`: it runs `fn`,
// returns the value of `ok`, and throws an `err` failure as a `DomainFailure` so
// the error adapter renders the API error contract. Unexpected throws propagate
// unchanged and become `internal_error`. Use it instead of calling
// `unwrapOrThrow` by hand so the unwrap cannot be forgotten. The value must not
// contain a `Result` (`ok(ok(1))`, `ok({ data: ok(1) })`): that does not compile, and a
// cast that gets past the types fails at run time as `internal_error`.
export function defineResultHandler<R extends Result<unknown> & ValidResult<R>>(
  fn: (event: H3Event) => R | Promise<R>,
): EventHandler<EventHandlerRequest, Promise<ResultValue<R>>> {
  return defineEventHandler(async event => assertNotResult(unwrapOrThrow(await fn(event)))) as
  EventHandler<EventHandlerRequest, Promise<ResultValue<R>>>
}
