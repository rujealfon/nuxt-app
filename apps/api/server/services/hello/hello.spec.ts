import { describe, expect, it } from 'vitest'
import { getHelloMessage } from './index'

describe('getHelloMessage', () => {
  it('returns the service greeting', () => {
    expect(getHelloMessage()).toEqual({ message: 'Hello from api.nuxt-app.com' })
  })
})
