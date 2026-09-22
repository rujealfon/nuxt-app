import { apiVersions, currentApiVersion } from '@nuxt-app/config'
import { v1 } from '@nuxt-app/types'
import { describe, expect, it } from 'vitest'
import { buildOpenApiDocument, buildVersionedPaths } from './openapi'

describe('buildOpenApiDocument', () => {
  it('reports the current version as the document version', () => {
    const document = buildOpenApiDocument()

    expect(document.openapi).toMatch(/^3\./)
    expect(document.info.version).toBe(currentApiVersion)
  })

  it('covers every registered version with tags and versioned paths', () => {
    const document = buildOpenApiDocument()

    expect(document.tags.map(tag => tag.name)).toContain('infra')
    expect(document.paths['/api/health']?.get?.tags).toEqual(['infra'])

    for (const version of apiVersions) {
      expect(document.tags.map(tag => tag.name)).toContain(version)
      expect(
        Object.keys(document.paths).some(path => path.startsWith(`/api/${version}/`)),
        `expected a documented path for ${version}`,
      ).toBe(true)
    }
  })

  it('documents the version advertisement headers on the hello operation', () => {
    const document = buildOpenApiDocument()
    const response = document.paths['/api/v1/hello']?.get?.responses['200']

    expect(response?.headers?.['x-api-version']?.schema).toEqual({
      type: 'string',
      enum: ['v1'],
    })
    expect(response?.content?.['application/json']?.schema).toEqual({
      $ref: '#/components/schemas/HelloResponse',
    })
  })

  it('derives component schemas from the shared Zod contracts', () => {
    const document = buildOpenApiDocument()

    expect(document.components.schemas.HelloResponse).toMatchObject({
      type: 'object',
      properties: { message: { type: 'string' } },
    })
    expect(document.paths['/api/health']?.get?.responses['200']?.content?.['application/json']?.schema).toEqual({
      $ref: '#/components/schemas/HealthResponse',
    })
    expect(document.components.schemas.HealthResponse).toMatchObject({
      type: 'object',
      properties: {
        status: { const: 'ok' },
        service: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    })
    const apiError = document.components.schemas.ApiError as {
      anyOf?: unknown[]
    }

    expect(JSON.stringify(apiError)).toContain('not_found')
    expect(apiError.anyOf).toHaveLength(2)
    expect(apiError.anyOf?.[0]).toMatchObject({
      properties: {
        error: { const: 'invalid_input' },
        message: { minLength: 1 },
        details: { type: 'array', minItems: 1 },
      },
    })
    expect(apiError.anyOf?.[1]).toMatchObject({
      properties: {
        message: { minLength: 1 },
        details: { not: {} },
      },
    })
  })

  it('keeps docs, spec, and API on one origin so try-it needs no CORS', () => {
    const document = buildOpenApiDocument()

    expect(document.servers).toEqual([
      { url: '/', description: expect.any(String) },
    ])
  })

  it('advertises the session cookie and bearer security schemes', () => {
    const document = buildOpenApiDocument()

    expect(document.components.securitySchemes).toMatchObject({
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
  })

  it('leaves public operations without a security requirement', () => {
    const document = buildOpenApiDocument()

    expect(document.paths['/api/v1/hello']?.get?.security).toBeUndefined()
  })

  it('marks authenticated operations with both schemes and a 401', () => {
    const paths = buildVersionedPaths({
      v1: [
        {
          suffix: '/secret',
          method: 'get',
          summary: 'Secret operation',
          responseName: 'HelloResponse',
          responseSchema: v1.helloResponseSchema,
          authenticated: true,
        },
      ],
    })

    const operation = paths['/api/v1/secret']?.get

    expect(operation?.security).toEqual([{ sessionCookie: [] }, { bearerAuth: [] }])
    expect(operation?.responses['401']?.content?.['application/json']?.schema).toEqual({
      $ref: '#/components/schemas/ApiError',
    })
  })

  it('documents the Better Auth email/password flow for same-origin try-it', () => {
    const document = buildOpenApiDocument()

    expect(document.tags.map(tag => tag.name)).toContain('auth')
    expect(document.paths['/api/auth/sign-in/email']?.post?.tags).toEqual(['auth'])
    expect(document.paths['/api/auth/sign-in/email']?.post?.requestBody?.content?.['application/json']?.schema)
      .toEqual({ $ref: '#/components/schemas/LoginCredentials' })
    expect(document.paths['/api/auth/sign-up/email']?.post?.requestBody?.content?.['application/json']?.schema)
      .toEqual({ $ref: '#/components/schemas/RegisterCredentials' })
    expect(document.paths['/api/auth/get-session']?.get?.responses['200']?.content?.['application/json']?.schema)
      .toEqual({ $ref: '#/components/schemas/AuthSessionResponse' })
    // Sign-out is a bodyless POST, but Better Auth rejects a missing JSON
    // `Content-Type` with 415, so the document declares a JSON body.
    expect(document.paths['/api/auth/sign-out']?.post?.requestBody?.content?.['application/json']?.schema)
      .toEqual({ $ref: '#/components/schemas/AuthSignOutRequest' })
  })

  it('keeps Better Auth on its own error contract instead of the API error contract', () => {
    const document = buildOpenApiDocument()

    expect(document.paths['/api/auth/sign-in/email']?.post?.responses.default?.content?.['application/json']?.schema)
      .toEqual({ $ref: '#/components/schemas/AuthError' })
    expect(document.components.schemas.AuthError).toMatchObject({
      type: 'object',
      properties: { message: { type: 'string' } },
    })
    expect(document.components.schemas.AuthSignInResponse).toMatchObject({
      type: 'object',
      properties: { redirect: { type: 'boolean' }, token: { type: 'string' } },
    })
    expect(document.components.schemas.LoginCredentials).toMatchObject({
      type: 'object',
      properties: { email: { type: 'string' }, password: { type: 'string' } },
    })
  })
})
