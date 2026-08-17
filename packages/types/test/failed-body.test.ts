import { describe, expect, it } from 'vitest'
import { failedResponseBody, messageFromFailedBody } from '../src/failed-body'

describe('messageFromFailedBody', () => {
  it('reads a message field', () => {
    expect(messageFromFailedBody({ message: 'Invalid credentials' })).toBe('Invalid credentials')
  })

  it('prefers the first validation issue', () => {
    expect(messageFromFailedBody({
      message: 'ignored',
      error: { issues: [{ message: 'Email and password are required' }] },
    })).toBe('Email and password are required')
  })

  it('reads a string error field', () => {
    expect(messageFromFailedBody({ error: 'nope' })).toBe('nope')
  })

  it('falls back when the body is empty', () => {
    expect(messageFromFailedBody(null)).toBe('Request failed')
    expect(messageFromFailedBody({})).toBe('Request failed')
  })
})

describe('failedResponseBody', () => {
  it('wraps a message', () => {
    expect(failedResponseBody('Unauthorized')).toEqual({ message: 'Unauthorized' })
  })
})
