const error = {
  type: 'object',
  required: ['error'],
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
  },
} as const

const authUser = {
  type: 'object',
  required: ['id', 'email', 'name', 'role'],
  properties: {
    id: { type: 'string' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    role: { type: 'string', enum: ['user', 'admin'] },
  },
} as const

const authResponse = {
  type: 'object',
  required: ['user'],
  properties: {
    user: authUser,
    message: { type: 'string' },
  },
} as const

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'nuxt-app API',
    version: '0.0.0',
    description: 'Local development reference. Session cookie: `nuxt_app_session`.',
  },
  servers: [{ url: '/', description: 'This API' }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Admin' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: { status: { type: 'string', example: 'ok' } },
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Registered',
            content: { 'application/json': { schema: authResponse } },
          },
          400: {
            description: 'Validation error',
            content: { 'application/json': { schema: error } },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Logged in',
            content: { 'application/json': { schema: authResponse } },
          },
          400: {
            description: 'Validation or auth error',
            content: { 'application/json': { schema: error } },
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out',
        responses: {
          200: {
            description: 'Logged out',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: { message: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user',
        responses: {
          200: {
            description: 'Session user, or null',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['user'],
                  properties: {
                    user: { anyOf: [authUser, { type: 'null' }] },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/admin/dashboard': {
      get: {
        tags: ['Admin'],
        summary: 'Admin dashboard',
        responses: {
          200: {
            description: 'Admin only',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message', 'user'],
                  properties: {
                    message: { type: 'string' },
                    user: authUser,
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthenticated',
            content: { 'application/json': { schema: error } },
          },
          403: {
            description: 'Not an admin',
            content: { 'application/json': { schema: error } },
          },
        },
      },
    },
  },
} as const
