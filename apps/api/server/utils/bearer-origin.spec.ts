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
    const response = await restrictBearerTokenResponse(sessionResponse(), 'https://app.example.com', config)

    expect(response.headers.get('set-auth-token')).toBeNull()
    expect(response.headers.get('access-control-expose-headers')).toBe('x-request-id')
    expect(response.headers.get('set-cookie')).toBe('better-auth.session_token=secret; HttpOnly; Path=/')
    await expect(response.text()).resolves.toBe('{"ok":true}')
  })

  it('removes the token when the request has no origin', async () => {
    const response = await restrictBearerTokenResponse(sessionResponse(), null, config)

    expect(response.headers.get('set-auth-token')).toBeNull()
    expect(response.headers.get('access-control-expose-headers')).toBe('x-request-id')
  })

  it('removes the token when the response has no exposed-headers list', async () => {
    const response = await restrictBearerTokenResponse(new Response(null, {
      headers: {
        'set-cookie': 'better-auth.session_token=secret; HttpOnly; Path=/',
        'set-auth-token': 'secret',
      },
    }), 'https://app.example.com', config)

    expect(response.headers.get('set-auth-token')).toBeNull()
    expect(response.headers.get('access-control-expose-headers')).toBeNull()
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
  })

  it('leaves an unrelated exposed-headers list unchanged', async () => {
    const original = new Response('{"ok":true}', {
      headers: { 'access-control-expose-headers': 'x-request-id' },
    })

    const response = await restrictBearerTokenResponse(original, 'https://app.example.com', config)

    expect(response).toBe(original)
    expect(response.headers.get('access-control-expose-headers')).toBe('x-request-id')
  })

  it('fails closed when a token-bearing auth endpoint unexpectedly returns non-JSON', async () => {
    const response = new Response('session-secret', {
      headers: { 'content-type': 'text/plain' },
    })

    await expect(restrictBearerTokenResponse(response, 'https://app.example.com', config, '/api/auth/get-session'))
      .rejects
      .toThrow('Expected a JSON response from /api/auth/get-session')
  })

  it('keeps the token for an explicit native origin', async () => {
    const response = await restrictBearerTokenResponse(sessionResponse(), 'capacitor://localhost', config)

    expect(response.headers.get('set-auth-token')).toBe('secret')
    expect(response.headers.get('access-control-expose-headers')).toBe('set-auth-token, x-request-id')
  })

  it('removes a token even for a native origin when bearer auth is disabled', async () => {
    const response = await restrictBearerTokenResponse(sessionResponse(), 'capacitor://localhost', { ...config, authBearerEnabled: false })

    expect(response.headers.get('set-auth-token')).toBeNull()
  })
})
