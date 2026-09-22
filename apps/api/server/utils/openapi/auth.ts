import type { OpenApiPathItem, OpenApiRequestBody } from './shared'
import { loginSchema, registerSchema } from '@nuxt-app/types'
import { z } from 'zod'
import { apiErrorResponse, jsonRef, toJsonSchema } from './shared'

const authUserSchema = z.looseObject({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
})

const authSessionSchema = z.looseObject({
  id: z.string(),
  token: z.string(),
  userId: z.string(),
  expiresAt: z.string(),
})

const authSignInResponseSchema = z.looseObject({
  redirect: z.boolean(),
  token: z.string(),
  url: z.string().nullable().optional(),
  user: authUserSchema,
})

const authSignUpResponseSchema = z.looseObject({
  token: z.string().nullable(),
  user: authUserSchema,
})

// `GET /api/auth/get-session` answers `null` (200) when no session is present.
const authSessionResponseSchema = z.union([
  z.looseObject({ session: authSessionSchema, user: authUserSchema }),
  z.null(),
])

const authSignOutRequestSchema = z.looseObject({
  callbackURL: z.string().optional(),
  disableRedirect: z.boolean().optional(),
  state: z.string().optional(),
})

const authSignOutResponseSchema = z.looseObject({
  success: z.boolean(),
  url: z.string().optional(),
  redirect: z.boolean().optional(),
})

function authRequestBody(schemaName: string): OpenApiRequestBody {
  return {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  }
}

function authPaths(): Record<string, OpenApiPathItem> {
  return {
    '/api/auth/sign-in/email': {
      post: {
        tags: ['auth'],
        summary: 'Sign in with email and password',
        description: 'Better Auth email/password sign-in. Success sets the `better-auth.session_token` cookie, which the browser stores for later try-it requests on this origin.',
        requestBody: authRequestBody('LoginCredentials'),
        responses: {
          200: jsonRef('AuthSignInResponse', 'Signed in; session cookie set.'),
          default: apiErrorResponse(),
        },
      },
    },
    '/api/auth/sign-up/email': {
      post: {
        tags: ['auth'],
        summary: 'Register with email and password',
        description: 'Better Auth email/password registration. Success signs the new user in and sets the session cookie. A body that fails the shared `RegisterCredentials` schema answers `invalid_input` with `details`.',
        requestBody: authRequestBody('RegisterCredentials'),
        responses: {
          200: jsonRef('AuthSignUpResponse', 'Registered and signed in; session cookie set.'),
          default: apiErrorResponse(),
        },
      },
    },
    '/api/auth/get-session': {
      get: {
        tags: ['auth'],
        summary: 'Current session',
        description: 'Returns the active session and user, or `null` when signed out. Useful to confirm a Scalar sign-in took effect.',
        responses: {
          200: jsonRef('AuthSessionResponse', 'Active session, or `null` when signed out.'),
          default: apiErrorResponse(),
        },
      },
    },
    '/api/auth/sign-out': {
      post: {
        tags: ['auth'],
        summary: 'Sign out',
        description: 'Clears the session and the session cookie. Better Auth requires a JSON `Content-Type`, so an empty object body (`{}`) is sent; all fields are optional.',
        requestBody: authRequestBody('AuthSignOutRequest'),
        responses: {
          200: jsonRef('AuthSignOutResponse', 'Signed out; session cookie cleared.'),
          default: apiErrorResponse(),
        },
      },
    },
  }
}

// Protected operations accept either Better Auth's HttpOnly session cookie or,
// on deployments with the bearer plugin enabled, the opaque session token.
export function authenticatedSecurity(): Array<Record<string, string[]>> {
  return [{ sessionCookie: [] }, { bearerAuth: [] }]
}

// Auth routes are unversioned and owned by Better Auth. This fragment keeps
// their vendor response shapes and security definitions out of the main
// versioned and infrastructure document builder.
export function buildAuthOpenApi() {
  return {
    tag: {
      name: 'auth',
      description: 'Better Auth email/password sign-in, sign-up, session, and sign-out. Same-origin try-it stores the session cookie. Failures use the API error contract.',
    },
    paths: authPaths(),
    schemas: {
      LoginCredentials: toJsonSchema(loginSchema),
      RegisterCredentials: toJsonSchema(registerSchema),
      AuthSignInResponse: toJsonSchema(authSignInResponseSchema),
      AuthSignUpResponse: toJsonSchema(authSignUpResponseSchema),
      AuthSessionResponse: toJsonSchema(authSessionResponseSchema),
      AuthSignOutRequest: toJsonSchema(authSignOutRequestSchema),
      AuthSignOutResponse: toJsonSchema(authSignOutResponseSchema),
    },
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'better-auth.session_token',
        description: 'Better Auth session cookie, set by `/api/auth/*` and HttpOnly. HTTPS deployments prefix it with `__Secure-`. Paste the cookie value to authenticate try-it requests.',
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Opaque session token in an `Authorization: Bearer <token>` header. Only available when the deployment enables bearer transport (`AUTH_BEARER_ENABLED=true`).',
      },
    },
  }
}
