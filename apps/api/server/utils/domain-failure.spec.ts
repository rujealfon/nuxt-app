import { apiErrorCodes, apiErrorSchema, loginSchema } from '@nuxt-app/types'
import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'
import {
  DomainFailure,
  domainFailure,
  domainFailureFrom,
  domainFailureMessages,
  failure,
  invalidInputFromZod,
} from './domain-failure'

describe('invalidInputFromZod', () => {
  it('builds invalid_input with input details from each issue', () => {
    const parsed = loginSchema.safeParse({ email: 'nope', password: '' })

    expect(parsed.success).toBe(false)
    if (parsed.success) {
      return
    }

    const result = invalidInputFromZod(parsed.error)

    expect(result).not.toBeInstanceOf(Error)
    expect(result.error).toBe('invalid_input')
    expect(result.message).toBe('The request was invalid')
    expect(result.details).toEqual([
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

describe('failure', () => {
  it('builds a plain value with the default safe message', () => {
    const value = failure('not_found')

    expect(value).not.toBeInstanceOf(Error)
    expect(value).toEqual({
      error: 'not_found',
      message: domainFailureMessages.not_found,
      details: undefined,
    })
  })

  it('keeps a message override and treats an empty one as absent', () => {
    expect(failure('conflict', 'Email taken').message).toBe('Email taken')
    expect(failure('conflict', '').message).toBe(domainFailureMessages.conflict)
  })

  it('keeps input details for invalid_input only', () => {
    const details = [{ path: ['id'], message: 'Missing' }]

    expect(failure('invalid_input', undefined, details).details).toEqual(details)
    expect(failure('not_found', undefined, details).details).toBeUndefined()
  })
})

describe('domainFailureFrom', () => {
  it('raises a failure value as the thrown form with the same fields', () => {
    const details = [{ path: ['email'], message: 'Invalid' }]
    const thrown = domainFailureFrom(failure('invalid_input', 'Bad', details))

    expect(thrown).toBeInstanceOf(DomainFailure)
    expect(thrown).toMatchObject({ error: 'invalid_input', message: 'Bad', details })
  })
})
