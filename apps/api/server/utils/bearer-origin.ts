import { authMount, sessionEndpoint, sessionTokenHeader } from '@nuxt-app/config'

export interface BearerOriginConfig {
  authBearerEnabled: boolean
  authBearerOrigins: string
}

export function bearerOrigins(value: string): string[] {
  return value.split(',').map(origin => origin.trim()).filter(Boolean)
}

export function isExplicitOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return Boolean(url.host) && `${url.protocol}//${url.host}` === origin
  }
  catch {
    return false
  }
}

export function canExposeBearerToken(origin: string | null | undefined, config: BearerOriginConfig): boolean {
  return Boolean(
    config.authBearerEnabled
    && origin
    && isExplicitOrigin(origin)
    && bearerOrigins(config.authBearerOrigins).includes(origin),
  )
}

// Better Auth endpoints whose JSON can carry the session token. Built from the
// shared mount and session endpoint so the client and the API agree on both.
const sessionTokenResponsePaths = new Set([
  `${authMount}${sessionEndpoint}`,
  `${authMount}/list-sessions`,
  `${authMount}/update-session`,
  `${authMount}/sign-in/email`,
  `${authMount}/sign-in/social`,
  `${authMount}/sign-up/email`,
  `${authMount}/change-password`,
])

function removeSessionTokens(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false
  }

  let changed = false
  for (const [key, nested] of Object.entries(value)) {
    if (key === 'token' && typeof nested === 'string') {
      delete (value as Record<string, unknown>)[key]
      changed = true
    }
    else if (removeSessionTokens(nested)) {
      changed = true
    }
  }
  return changed
}

// Better Auth emits the session token in both headers and JSON responses.
// Only explicitly configured native origins may receive either representation.
export async function restrictBearerTokenResponse(response: Response, origin: string | null, config: BearerOriginConfig, path = ''): Promise<Response> {
  if (canExposeBearerToken(origin, config)) {
    return response
  }

  const headers = new Headers(response.headers)
  let changed = headers.has(sessionTokenHeader)
  headers.delete(sessionTokenHeader)
  const exposed = headers.get('access-control-expose-headers')
  if (exposed) {
    const remaining = exposed.split(',').map(header => header.trim()).filter(header => header.toLowerCase() !== sessionTokenHeader)
    if (remaining.length !== exposed.split(',').length) {
      changed = true
    }
    if (remaining.length) {
      headers.set('access-control-expose-headers', remaining.join(', '))
    }
    else {
      headers.delete('access-control-expose-headers')
    }
  }

  let body: BodyInit | null = response.body
  if (sessionTokenResponsePaths.has(path) && response.status < 300 && body) {
    if (!headers.get('content-type')?.toLowerCase().includes('json')) {
      throw new Error(`Expected a JSON response from ${path}`)
    }

    const payload: unknown = await response.clone().json()
    if (removeSessionTokens(payload)) {
      body = JSON.stringify(payload)
      headers.delete('content-length')
      headers.delete('etag')
      changed = true
    }
  }

  if (!changed) {
    return response
  }

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
