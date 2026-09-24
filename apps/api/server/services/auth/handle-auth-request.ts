import type { H3Event } from 'h3'
import { appendResponseHeader, setResponseHeader, toWebRequest } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { requestPath } from '../../utils/api-paths'
import { useAuth } from '../../utils/auth'
import { restrictBearerTokenResponse } from '../../utils/bearer-origin'
import { authFailureFromResponse } from './auth-error-contract'
import { isPasswordFlowPath, validateAuthRequest } from './validate-auth-request'

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
  const request = toWebRequest(event)
  const path = requestPath(event)

  if (isPasswordFlowPath(path)) {
    // Only JSON bodies are pre-validated. A form-encoded body (Better Auth
    // allows it) or an empty one stays with Better Auth, which owns its own
    // parse error.
    const body = await jsonBody(request)
    const failure = body === undefined ? undefined : validateAuthRequest(path, body)

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
