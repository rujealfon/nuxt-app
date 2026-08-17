import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { loadRootEnv } from '../load-root-env'

describe('loadRootEnv', () => {
  it('does not override an already-set process env value', () => {
    const previous = process.env.NUXT_PUBLIC_API_URL
    process.env.NUXT_PUBLIC_API_URL = 'https://already-set.example'
    loadRootEnv()
    expect(process.env.NUXT_PUBLIC_API_URL).toBe('https://already-set.example')
    if (previous === undefined)
      delete process.env.NUXT_PUBLIC_API_URL
    else
      process.env.NUXT_PUBLIC_API_URL = previous
  })

  it('does not throw when the repository-root .env is missing', () => {
    expect(() => loadRootEnv()).not.toThrow()
  })
})
