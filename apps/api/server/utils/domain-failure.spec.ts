import { apiErrorCodes, apiErrorSchema, loginSchema } from '@nuxt-app/types'
import { describe, expect, it } from 'vitest'
import { domainFailureMessages, invalidInputFromZod } from './domain-failure'

describe('invalidInputFromZod', () => {
  it('builds invalid_input with input details from each issue', () => {
    const parsed = loginSchema.safeParse({ email: 'nope', password: '' })

    expect(parsed.success).toBe(false)
    if (parsed.success) {
      return
    }

    const failure = invalidInputFromZod(parsed.error)

    expect(failure.code).toBe('invalid_input')
    expect(failure.message).toBe('The request was invalid')
    expect(failure.details).toEqual([
      { path: ['email'], message: 'Enter a valid email address' },
      { path: ['password'], message: 'Password is required' },
    ])
  })
})

describe('domainFailureMessages', () => {
  it('satisfy the API error contract for every code', () => {
    for (const code of apiErrorCodes) {
      expect(apiErrorSchema.parse({
        error: code,
        message: domainFailureMessages[code],
      })).toMatchObject({ error: code, message: domainFailureMessages[code] })
    }
  })
})
