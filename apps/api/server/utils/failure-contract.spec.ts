import { apiErrorCodes } from '@nuxt-app/types'
import { describe, expect, it } from 'vitest'
import { concealedErrorFromStatus, errorFromStatus, statusByError } from './failure-contract'

describe('statusByError', () => {
  it('covers every API error code', () => {
    expect(Object.keys(statusByError).sort()).toEqual([...apiErrorCodes].sort())
  })
})

describe('errorFromStatus', () => {
  it('maps a dedicated status onto its code', () => {
    expect(errorFromStatus(401)).toBe('unauthenticated')
    expect(errorFromStatus(429)).toBe('rate_limited')
  })

  it('conceals an unmapped 4xx as not_found', () => {
    expect(errorFromStatus(418)).toBe('not_found')
    expect(errorFromStatus(422)).toBe('not_found')
  })

  it('leaves 5xx and non-HTTP statuses to the caller', () => {
    expect(errorFromStatus(503)).toBeUndefined()
    expect(errorFromStatus(200)).toBeUndefined()
  })
})

describe('concealedErrorFromStatus', () => {
  it('renders a dedicated status as its code', () => {
    expect(concealedErrorFromStatus(409)).toBe('conflict')
  })

  it('conceals an unmapped 4xx as not_found', () => {
    expect(concealedErrorFromStatus(422)).toBe('not_found')
  })

  it('conceals every 5xx as internal_error', () => {
    expect(concealedErrorFromStatus(503)).toBe('internal_error')
  })
})
