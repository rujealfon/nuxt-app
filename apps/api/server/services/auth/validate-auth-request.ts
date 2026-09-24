import type { DomainFailure } from '../../utils/domain-failure'
import { authMount } from '@nuxt-app/config'
import { loginSchema, registerSchema } from '@nuxt-app/types'
import { invalidInputFromZod } from '../../utils/domain-failure'

// The password flows the API documents, keyed by the path relative to
// `/api/auth`. The request bodies are the same shared schemas the client forms
// validate against. Better Auth validates its own copy of these endpoints and
// drops the field issues when it serializes an error, so the API re-parses the
// body here to produce `details` for `invalid_input`.
const passwordFlowSchemas = {
  '/sign-up/email': registerSchema,
  '/sign-in/email': loginSchema,
} as const

type PasswordFlowSchema = (typeof passwordFlowSchemas)[keyof typeof passwordFlowSchemas]

// The auth mount is `server/api/auth/[...all].ts`. Requiring the prefix keeps
// an unknown nested path (which Better Auth 404s) out of request validation.
function flowPath(path: string): string | undefined {
  return path.startsWith(`${authMount}/`) ? path.slice(authMount.length) : undefined
}

function schemaFor(path: string): PasswordFlowSchema | undefined {
  const flow = flowPath(path)

  if (flow === undefined || !(flow in passwordFlowSchemas)) {
    return undefined
  }

  return passwordFlowSchemas[flow as keyof typeof passwordFlowSchemas]
}

export function isPasswordFlowPath(path: string): boolean {
  return schemaFor(path) !== undefined
}

export function validateAuthRequest(path: string, body: unknown): DomainFailure | undefined {
  const schema = schemaFor(path)

  if (!schema) {
    return undefined
  }

  const result = schema.safeParse(body)

  return result.success ? undefined : invalidInputFromZod(result.error)
}
