import type { H3Event } from 'h3'
import { appendResponseHeader, getRequestIP, getRequestURL, setResponseHeader } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { requestPath } from '#server/utils/api-paths'
import { useAuth } from '#server/utils/auth'
import { authHeaders } from '#server/utils/auth-headers'
import { restrictBearerTokenResponse } from '#server/utils/bearer-origin'
import { domainFailure } from '#server/utils/domain-failure'
import { createRateLimitStorage } from '#server/utils/rate-limit'
import { rateLimitPolicy } from '#server/utils/rate-limit-policy'
import { authFailureFromResponse } from './auth-error-contract'
import { closeAuthUpload, readAuthBody } from './read-auth-body'
import { isPasswordFlowPath, validateAuthRequest } from './validate-auth-request'

const prevalidationStorage = createRateLimitStorage({ failClosed: true })

async function jsonBody(source: Request | Response): Promise<unknown> {
  try {
    return await source.clone().json()
  }
  catch {
    // No body, empty body, or a non-JSON body: Better Auth (or the status
    // fallback) owns the outcome.
    return undefined
  }
}

// Better Auth's retry hint on rate limiting and any cookie it wants to clear on
// a failed request must survive onto the API error contract. Headers set on the
// event are not cleared by the error adapter, so copy them before throwing.
function preserveAuthErrorHeaders(event: H3Event, headers: Headers) {
  const retryAfter = headers.get('x-retry-after')

  if (retryAfter) {
    setResponseHeader(event, 'x-retry-after', retryAfter)
  }

  const cookies = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? []

  for (const cookie of cookies) {
    appendResponseHeader(event, 'set-cookie', cookie)
  }
}

// Better Auth answers with its own error shape (`{ message, code }`) and drops
// the field issues. This module normalizes every failure onto the API error
// contract and re-validates the two password flows so `invalid_input` carries
// `details`. See docs/adr/0004-auth-error-contract.md.
export async function handleAuthRequest(event: H3Event): Promise<Response | undefined> {
  const path = requestPath(event)
  // Request/URL canonicalizes dot segments before Better Auth routes it. Guard
  // that destination as well as H3's decoded path before any body stream starts.
  const requestURL = event.web?.request ? new URL(event.web.request.url) : getRequestURL(event)
  const passwordFlow = isPasswordFlowPath(path) || isPasswordFlowPath(requestURL.pathname)
  const validationPath = isPasswordFlowPath(path) ? path : requestURL.pathname
  // Match the ordinary Nitro limiter's deployment trust policy. Never let a
  // caller supply Better Auth's identity, including through the private header.
  const ip = getRequestIP(event, { xForwardedFor: process.env.VERCEL === '1' })
  if (passwordFlow) {
    if (useRuntimeConfig(event).rateLimitEnabled) {
      const { allowed, retryAfter } = await prevalidationStorage.consume(
        `${ip || 'unknown'}:auth-prevalidation`,
        rateLimitPolicy,
      )
      if (!allowed) {
        setResponseHeader(event, 'x-retry-after', String(retryAfter))
        setResponseHeader(event, 'retry-after', retryAfter ?? 0)
        closeAuthUpload(event)
        throw domainFailure('rate_limited')
      }
    }
  }
  // Bound every upload before constructing a Request. H3's Node stream adapter
  // starts buffering even if Better Auth later rejects the route or caller.
  const bodyBytes = ['GET', 'HEAD'].includes(event.method) ? undefined : await readAuthBody(event)
  const headers = authHeaders(event, event.web?.request?.headers ?? event.headers)
  const request = new Request(requestURL, {
    method: event.method,
    headers,
    body: bodyBytes?.length ? bodyBytes as BodyInit : undefined,
    signal: event.web?.request?.signal,
  })

  if (passwordFlow) {
    // Only JSON bodies are pre-validated. A form-encoded body (Better Auth
    // allows it) or an empty one stays with Better Auth, which owns its own
    // parse error.
    let body: unknown
    try {
      body = JSON.parse(new TextDecoder().decode(bodyBytes))
    }
    catch {}
    const failure = body === undefined ? undefined : validateAuthRequest(validationPath, body)

    if (failure) {
      throw failure
    }
  }

  const response = await useAuth().handler(request)

  if (response.status < 400) {
    return restrictBearerTokenResponse(response, request.headers.get('origin'), useRuntimeConfig(event), path)
  }

  preserveAuthErrorHeaders(event, response.headers)

  throw authFailureFromResponse(response.status, await jsonBody(response))
}
