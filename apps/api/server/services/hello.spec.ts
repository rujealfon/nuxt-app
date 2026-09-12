import { describe, expect, it } from 'vitest'
import { getHelloMessage } from './hello'

describe('getHelloMessage', () => {
  it('returns the service greeting', () => {
    expect(getHelloMessage()).toEqual({ message: 'Hello from api.mysite.com' })
  })
})
