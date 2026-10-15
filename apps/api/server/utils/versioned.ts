import type { ApiVersion } from '@nuxt-app/config'
import type { EventHandler, EventHandlerRequest, EventHandlerResponse, H3Event } from 'h3'
import type { Failure } from './domain-failure'
import type { Err, Ok, ValidResult } from './result'
import { versionMeta } from '@nuxt-app/config'
import { defineEventHandler, setHeader } from 'h3'
import { deprecationHeaders } from './deprecation'
import { assertNotResult, isResult, unwrapOrThrow } from './result'

// The response body a versioned route sends: a handler's return type with an
// `Ok<T>` replaced by `T`. An `Err` never produces a body (it throws), and any
// other value is the body as is. Distributes over `Result<T>`, so it yields `T`.
export type VersionedBody<R> = R extends Ok<infer T> ? T : R extends Err<Failure> ? never : R

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | null | undefined)?.then === 'function'
}

// A `Result` becomes its value (`ok`) or a thrown `DomainFailure` (`err`); any
// other value is the body. The final value must not itself be a `Result`, so a
// `Result` nested in a `Result` (a bug) fails as an unexpected fault instead of
// being serialised.
function unwrapBody(value: unknown): unknown {
  return assertNotResult(
    isResult(value) ? unwrapOrThrow(value as Ok<unknown> | Err<Failure>) : value,
  )
}

// Wraps a route handler so every versioned response advertises its version and,
// once deprecated, a `Deprecation` + `Sunset` pair for clients to react to. The
// handler returns a body or a `Result<T>` (sync or async): `ok` sends its value
// and `err` throws the failure for the error adapter, so the unwrap cannot be
// forgotten and the route's body type is the unwrapped `T`. An `err` must carry a
// `Failure`: anything else does not compile. Version headers are set
// before the handler runs, so they stay on a failure response too.
export function defineVersionedHandler<R extends ValidResult<R>>(
  version: ApiVersion,
  handler: (event: H3Event) => R | Promise<R>,
): EventHandler<EventHandlerRequest, EventHandlerResponse<VersionedBody<Awaited<R>>>> {
  type Body = VersionedBody<Awaited<R>>

  return defineEventHandler<EventHandlerRequest, EventHandlerResponse<Body>>((event) => {
    setHeader(event, 'x-api-version', version)

    deprecationHeaders(versionMeta(version)).forEach(([name, value]) => {
      setHeader(event, name, value)
    })

    const body = handler(event)

    return (
      isPromiseLike(body) ? body.then(unwrapBody) : unwrapBody(body)
    ) as EventHandlerResponse<Body>
  })
}
