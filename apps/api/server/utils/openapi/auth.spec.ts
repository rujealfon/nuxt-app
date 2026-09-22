import { describe, expect, it } from 'vitest'
import { authenticatedSecurity, buildAuthOpenApi } from './auth'

describe('buildAuthOpenApi', () => {
  it('advertises the session cookie and bearer security schemes', () => {
    const auth = buildAuthOpenApi()

    expect(auth.securitySchemes).toMatchObject({
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'better-auth.session_token',
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    })
    expect(authenticatedSecurity()).toEqual([{ sessionCookie: [] }, { bearerAuth: [] }])
  })

  it('documents the Better Auth email/password flow for same-origin try-it', () => {
    const auth = buildAuthOpenApi()

    expect(auth.tag.name).toBe('auth')
    expect(auth.paths['/api/auth/sign-in/email']?.post?.requestBody?.content?.['application/json']?.schema)
      .toEqual({ $ref: '#/components/schemas/LoginCredentials' })
    expect(auth.paths['/api/auth/sign-up/email']?.post?.requestBody?.content?.['application/json']?.schema)
      .toEqual({ $ref: '#/components/schemas/RegisterCredentials' })
    expect(auth.paths['/api/auth/get-session']?.get?.responses['200']?.content?.['application/json']?.schema)
      .toEqual({ $ref: '#/components/schemas/AuthSessionResponse' })
    // Sign-out is a bodyless POST, but Better Auth rejects a missing JSON
    // `Content-Type` with 415, so the document declares a JSON body.
    expect(auth.paths['/api/auth/sign-out']?.post?.requestBody?.content?.['application/json']?.schema)
      .toEqual({ $ref: '#/components/schemas/AuthSignOutRequest' })
  })

  it('uses the API error contract and exposes the auth schemas', () => {
    const auth = buildAuthOpenApi()

    for (const path of [
      '/api/auth/sign-in/email',
      '/api/auth/sign-up/email',
      '/api/auth/get-session',
      '/api/auth/sign-out',
    ]) {
      const method = path === '/api/auth/get-session' ? 'get' : 'post'

      expect(auth.paths[path]?.[method]?.responses.default?.content?.['application/json']?.schema)
        .toEqual({ $ref: '#/components/schemas/ApiError' })
    }

    expect(auth.schemas.AuthSignInResponse).toMatchObject({
      type: 'object',
      properties: { redirect: { type: 'boolean' }, token: { type: 'string' } },
    })
    expect(auth.schemas.LoginCredentials).toMatchObject({
      type: 'object',
      properties: { email: { type: 'string' }, password: { type: 'string' } },
    })
  })
})
