import { apiErrorCodes, apiErrorSchema, loginSchema } from '@nuxt-app/types'
import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'
import { domainFailure, domainFailureMessages, invalidInputFromZod } from './domain-failure'

describe('invalidInputFromZod', () => {
  it('builds invalid_input with input details from each issue', () => {
    const parsed = loginSchema.safeParse({ email: 'nope', password: '' })

    expect(parsed.success).toBe(false)
    if (parsed.success) {
      return
    }

    const failure = invalidInputFromZod(parsed.error)

    expect(failure.error).toBe('invalid_input')
    expect(failure.message).toBe('The request was invalid')
    expect(failure.details).toEqual([
      { path: ['email'], message: 'Enter a valid email address' },
      { path: ['password'], message: 'Password is required' },
    ])
  })

  it('omits details that cannot satisfy the contract', () => {
    const zodError = new ZodError([
      { code: 'custom', path: ['email'], message: '' },
    ] as never)

    expect(invalidInputFromZod(zodError).details).toBeUndefined()
  })
})

describe('domainFailureMessages', () => {
  it('satisfy the API error contract for every `error`', () => {
    for (const code of apiErrorCodes) {
      expect(apiErrorSchema.parse({
        error: code,
        message: domainFailureMessages[code],
      })).toMatchObject({ error: code, message: domainFailureMessages[code] })
    }
  })
})

describe('domainFailure', () => {
  it('drops input details on a code other than invalid_input', () => {
    expect(domainFailure('not_found', undefined, [
      { path: ['id'], message: 'Missing' },
    ]).details).toBeUndefined()
  })
})
