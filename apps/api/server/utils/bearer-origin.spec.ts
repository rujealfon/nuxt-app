import { describe, expect, it } from 'vitest'
import { canExposeBearerToken, restrictBearerTokenResponse } from './bearer-origin'

const config = {
  authBearerEnabled: true,
  authBearerOrigins: 'capacitor://localhost, https://localhost',
}

function sessionResponse() {
  return new Response('{"ok":true}', {
    headers: {
      'set-cookie': 'better-auth.session_token=secret; HttpOnly; Path=/',
      'set-auth-token': 'secret',
      'access-control-expose-headers': 'set-auth-token, x-request-id',
      'x-request-id': 'request-1',
    },
  })
}

describe('bearer token origin boundary', () => {
  it('allows only explicitly listed origins when bearer auth is enabled', () => {
    expect(canExposeBearerToken('capacitor://localhost', config)).toBe(true)
    expect(canExposeBearerToken('https://localhost', config)).toBe(true)
    expect(canExposeBearerToken('https://app.example.com', config)).toBe(false)
    expect(canExposeBearerToken(null, config)).toBe(false)
    expect(canExposeBearerToken('capacitor://localhost', { ...config, authBearerEnabled: false })).toBe(false)
    expect(canExposeBearerToken('capacitor://localhost', { ...config, authBearerOrigins: '' })).toBe(false)
    expect(canExposeBearerToken('https://app.example.com', { ...config, authBearerOrigins: ',' })).toBe(false)
    expect(canExposeBearerToken('null', { ...config, authBearerOrigins: 'null' })).toBe(false)
  })

  it('removes the token from a cookie-mode browser response without changing its cookie or body', async () => {
    const response = restrictBearerTokenResponse(sessionResponse(), 'https://app.example.com', config)

    expect(response.headers.get('set-auth-token')).toBeNull()
    expect(response.headers.get('access-control-expose-headers')).toBe('x-request-id')
    expect(response.headers.get('set-cookie')).toBe('better-auth.session_token=secret; HttpOnly; Path=/')
    await expect(response.text()).resolves.toBe('{"ok":true}')
  })

  it('removes the token when the request has no origin', () => {
    const response = restrictBearerTokenResponse(sessionResponse(), null, config)

    expect(response.headers.get('set-auth-token')).toBeNull()
    expect(response.headers.get('access-control-expose-headers')).toBe('x-request-id')
  })

  it('removes the token when the response has no exposed-headers list', () => {
    const response = restrictBearerTokenResponse(new Response(null, {
      headers: {
        'set-cookie': 'better-auth.session_token=secret; HttpOnly; Path=/',
        'set-auth-token': 'secret',
      },
    }), 'https://app.example.com', config)

    expect(response.headers.get('set-auth-token')).toBeNull()
    expect(response.headers.get('access-control-expose-headers')).toBeNull()
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
  })

  it('keeps the token for an explicit native origin', () => {
    const response = restrictBearerTokenResponse(sessionResponse(), 'capacitor://localhost', config)

    expect(response.headers.get('set-auth-token')).toBe('secret')
    expect(response.headers.get('access-control-expose-headers')).toBe('set-auth-token, x-request-id')
  })

  it('removes a token even for a native origin when bearer auth is disabled', () => {
    const response = restrictBearerTokenResponse(sessionResponse(), 'capacitor://localhost', { ...config, authBearerEnabled: false })

    expect(response.headers.get('set-auth-token')).toBeNull()
  })
})
