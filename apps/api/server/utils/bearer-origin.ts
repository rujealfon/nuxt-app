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

// Better Auth's bearer plugin emits the session token whenever it sets a
// session cookie. Keep that header off responses to browser and unknown origins.
export function restrictBearerTokenResponse(response: Response, origin: string | null, config: BearerOriginConfig): Response {
  if (canExposeBearerToken(origin, config)) {
    return response
  }

  const headers = new Headers(response.headers)
  if (!headers.has('set-auth-token') && !headers.has('access-control-expose-headers')) {
    return response
  }

  headers.delete('set-auth-token')
  const exposed = headers.get('access-control-expose-headers')
  if (exposed) {
    const remaining = exposed.split(',').map(header => header.trim()).filter(header => header.toLowerCase() !== 'set-auth-token')
    if (remaining.length) {
      headers.set('access-control-expose-headers', remaining.join(', '))
    }
    else {
      headers.delete('access-control-expose-headers')
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
